from pydantic import BaseModel, EmailStr, Field, field_validator


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None
    # Voice AiLunaPro bot protection (services/auth/signup_guard.py).
    # `website` is a honeypot: hidden from people, filled by bots.
    website: str | None = None
    # Epoch milliseconds when the form was first shown.
    started_at: int | None = None
    turnstile_token: str | None = None
    # Language of the confirmation email.
    locale: str | None = None

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str | None
    name: str | None = None
    organization_id: int | None = None
    provider_id: str | None = None


class AuthResponse(BaseModel):
    token: str
    user: UserResponse


# --- Voice AiLunaPro: email confirmation -----------------------------------


class SignupResponse(BaseModel):
    """Either a session (no confirmation needed) or a "check your inbox"."""

    verification_required: bool
    email: str
    token: str | None = None
    user: UserResponse | None = None


class VerifyEmailRequest(BaseModel):
    token: str
    # Language of the welcome email sent once the address is confirmed.
    locale: str | None = None


class ResendVerificationRequest(BaseModel):
    email: EmailStr
    locale: str | None = None


class ForgotPasswordRequest(BaseModel):
    """Voice AiLunaPro: ask for a reset link. Answered identically whether or
    not the address has an account, so it cannot enumerate customers."""

    email: EmailStr
    locale: str | None = None


class ResetPasswordRequest(BaseModel):
    """Voice AiLunaPro: redeem the emailed link and set a new password."""

    token: str
    password: str = Field(min_length=8, max_length=200)
    locale: str | None = None


class SignupConfigResponse(BaseModel):
    signup_enabled: bool
    verification_required: bool
    turnstile_site_key: str | None = None
    # False when outgoing mail is not configured: the UI then hides the
    # "forgot password" link rather than offering a dead end.
    password_reset_enabled: bool = False
