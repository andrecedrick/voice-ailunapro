from fastapi import APIRouter, Depends, HTTPException, Request
from loguru import logger

from api.constants import ENABLE_SIGNUP, TURNSTILE_SITE_KEY
from api.db import db_client
from api.db.models import UserModel
from api.enums import PostHogEvent
from api.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    SignupConfigResponse,
    SignupRequest,
    SignupResponse,
    UserResponse,
    VerifyEmailRequest,
)
from api.services.auth.depends import get_user, require_local_auth
from api.services.auth.email_verification import (
    read_verification_token,
    send_verification_email,
    send_welcome_email,
    verification_required,
)
from api.services.auth.password_reset import (
    read_reset_token,
    reset_available,
    send_password_changed_email,
    send_reset_email,
    token_matches,
)
from api.services.auth.signup_guard import (
    enforce_rate_limit,
    is_disposable,
    looks_like_bot,
    turnstile_enabled,
    verify_turnstile,
)
from api.services.organization_bootstrap import ensure_organization_bootstrapped
from api.services.posthog_client import capture_event
from api.utils.auth import create_jwt_token, hash_password, verify_password

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)


@router.get(
    "/signup-config",
    response_model=SignupConfigResponse,
    dependencies=[Depends(require_local_auth)],
)
async def signup_config():
    """Voice AiLunaPro: what the sign-up form needs to know at runtime."""
    return SignupConfigResponse(
        signup_enabled=ENABLE_SIGNUP,
        verification_required=verification_required(),
        turnstile_site_key=TURNSTILE_SITE_KEY if turnstile_enabled() else None,
        password_reset_enabled=reset_available(),
    )


@router.post(
    "/signup",
    response_model=SignupResponse,
    dependencies=[Depends(require_local_auth)],
)
async def signup(request: SignupRequest, http_request: Request):
    if not ENABLE_SIGNUP:
        raise HTTPException(status_code=403, detail="Signup is disabled")

    # BRAND: Voice AiLunaPro bot protection. See services/auth/signup_guard.py.
    await enforce_rate_limit(http_request, "signup")
    if looks_like_bot(honeypot=request.website, started_at_ms=request.started_at):
        logger.info("Dropped a sign-up that looked automated")
        # Answer exactly as a real sign-up would, so the bot learns nothing.
        return SignupResponse(verification_required=True, email=request.email)
    await verify_turnstile(request.turnstile_token, http_request)
    if is_disposable(request.email):
        raise HTTPException(
            status_code=400,
            detail="Please sign up with a permanent email address.",
        )

    # Check if email is already taken
    existing_user = await db_client.get_user_by_email(request.email)
    if existing_user:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Hash password and create user
    hashed = hash_password(request.password)
    user = await db_client.create_user_with_email(
        email=request.email,
        password_hash=hashed,
        name=request.name,
    )

    # Create organization for the user
    org_provider_id = f"org_{user.provider_id}"
    organization, _ = await db_client.get_or_create_organization_by_provider_id(
        org_provider_id=org_provider_id, user_id=user.id
    )

    # Link user to organization
    await db_client.add_user_to_organization(user.id, organization.id)
    await db_client.update_user_selected_organization(user.id, organization.id)

    # Create default service configuration. This never raises, so signup still
    # succeeds if MPS is down; `_handle_oss_auth` re-enters bootstrap on the
    # user's subsequent authenticated requests, so a failure here is recovered
    # rather than permanent. Doing it here anyway means the common case has a
    # model configuration and SIP connectivity by the time the UI first loads.
    await ensure_organization_bootstrapped(
        organization.id,
        created_by=user.provider_id,
    )

    capture_event(
        distinct_id=str(user.provider_id),
        event=PostHogEvent.SIGNED_UP,
        properties={
            "organization_id": organization.id,
            "auth_provider": "local",
        },
    )

    # BRAND: confirm the address before the first sign-in. Until SMTP is
    # configured the account is confirmed on the spot, as before.
    if verification_required():
        await send_verification_email(
            user_id=user.id, email=user.email, locale=request.locale
        )
        return SignupResponse(verification_required=True, email=user.email)

    await db_client.mark_user_email_verified(user.id)
    token = create_jwt_token(user.id, request.email)
    return SignupResponse(
        verification_required=False,
        email=user.email,
        token=token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            name=request.name,
            organization_id=organization.id,
            provider_id=user.provider_id,
        ),
    )


@router.post(
    "/login",
    response_model=AuthResponse,
    dependencies=[Depends(require_local_auth)],
)
async def login(request: LoginRequest, http_request: Request):
    # BRAND: brute-force brake. See services/auth/signup_guard.py.
    await enforce_rate_limit(http_request, "login")

    # Look up user by email
    user = await db_client.get_user_by_email(request.email)
    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Verify password
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # BRAND: an unconfirmed address cannot sign in. Checked only after the
    # password, so this never reveals which emails have accounts.
    if verification_required() and user.email_verified_at is None:
        raise HTTPException(status_code=403, detail="email_not_verified")

    # Create JWT token
    token = create_jwt_token(user.id, user.email)

    capture_event(
        distinct_id=str(user.provider_id),
        event=PostHogEvent.SIGNED_IN,
        properties={
            "organization_id": user.selected_organization_id,
            "auth_provider": "local",
        },
    )

    return AuthResponse(
        token=token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            organization_id=user.selected_organization_id,
            provider_id=user.provider_id,
        ),
    )


@router.post(
    "/verify-email",
    response_model=AuthResponse,
    dependencies=[Depends(require_local_auth)],
)
async def verify_email(request: VerifyEmailRequest):
    """Voice AiLunaPro: confirm the address from the emailed link, then sign in."""
    claims = read_verification_token(request.token)
    if claims is None:
        raise HTTPException(status_code=400, detail="invalid_or_expired_link")
    user_id, email = claims

    user = await db_client.get_user_by_email(email)
    # The token names a user id AND an email; both must still match, so a link
    # sent before an email change cannot confirm the new address.
    if user is None or user.id != user_id:
        raise HTTPException(status_code=400, detail="invalid_or_expired_link")

    first_time = user.email_verified_at is None
    await db_client.mark_user_email_verified(user.id)
    if first_time:
        await send_welcome_email(email=user.email, locale=request.locale)

    return AuthResponse(
        token=create_jwt_token(user.id, user.email),
        user=UserResponse(
            id=user.id,
            email=user.email,
            organization_id=user.selected_organization_id,
            provider_id=user.provider_id,
        ),
    )


@router.post(
    "/resend-verification",
    dependencies=[Depends(require_local_auth)],
)
async def resend_verification(request: ResendVerificationRequest, http_request: Request):
    """Voice AiLunaPro: send a fresh confirmation link.

    Always answers the same way, whether or not the address has an account,
    so it cannot be used to discover who is registered.
    """
    await enforce_rate_limit(http_request, "signup")
    if verification_required():
        user = await db_client.get_user_by_email(request.email)
        if user is not None and user.email_verified_at is None:
            await send_verification_email(
                user_id=user.id, email=user.email, locale=request.locale
            )
    return {"sent": True}


@router.post(
    "/password/forgot",
    dependencies=[Depends(require_local_auth)],
)
async def forgot_password(request: ForgotPasswordRequest, http_request: Request):
    """Voice AiLunaPro: email a single-use link to set a new password.

    Always answers {"sent": true}. Saying "no such account" here would turn
    this endpoint into a way of checking which addresses are customers, and
    the sender cannot tell the difference anyway.
    """
    await enforce_rate_limit(http_request, "signup")
    if reset_available():
        user = await db_client.get_user_by_email(request.email)
        # Accounts created through an identity provider have no password of
        # ours to reset; sending them a link would only confuse them.
        if user is not None and user.password_hash:
            await send_reset_email(
                user_id=user.id,
                email=user.email,
                password_hash=user.password_hash,
                locale=request.locale,
            )
    return {"sent": True}


@router.post(
    "/password/reset",
    response_model=AuthResponse,
    dependencies=[Depends(require_local_auth)],
)
async def reset_password(request: ResetPasswordRequest, http_request: Request):
    """Voice AiLunaPro: redeem the emailed link and sign the user straight in."""
    await enforce_rate_limit(http_request, "signup")
    claims = read_reset_token(request.token)
    if claims is None:
        raise HTTPException(status_code=400, detail="invalid_or_expired_link")
    user_id, email, fingerprint = claims

    user = await db_client.get_user_by_email(email)
    if user is None or user.id != user_id or not user.password_hash:
        raise HTTPException(status_code=400, detail="invalid_or_expired_link")
    # The fingerprint is of the hash the account had when the link was issued.
    # Once the password changes, every earlier link stops working - which is
    # what makes this single-use without a table of spent tokens.
    if not token_matches(fingerprint, user.password_hash):
        raise HTTPException(status_code=400, detail="invalid_or_expired_link")

    await db_client.update_user_password(user.id, hash_password(request.password))
    # Reaching the link proves control of the inbox, so an address still
    # waiting on confirmation is confirmed by the same act.
    await db_client.mark_user_email_verified(user.id)
    await send_password_changed_email(email=user.email, locale=request.locale)

    return AuthResponse(
        token=create_jwt_token(user.id, user.email),
        user=UserResponse(
            id=user.id,
            email=user.email,
            organization_id=user.selected_organization_id,
            provider_id=user.provider_id,
        ),
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user(user: UserModel = Depends(get_user)):
    return UserResponse(
        id=user.id,
        email=user.email,
        organization_id=user.selected_organization_id,
        provider_id=user.provider_id,
    )
