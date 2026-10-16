"""Founders offer waves and partner tokens. See api/services/billing/growth.py."""

from api.services.billing import growth


def test_waves_drop_discount_and_close():
    s = growth.founder_state(0, now=0)
    assert (s.open, s.wave, s.percent_off, s.wave_seats_left, s.next_percent_off) == (True, 1, 30, 10, 20)
    s = growth.founder_state(10, now=0)
    assert (s.wave, s.percent_off, s.wave_seats_left) == (2, 20, 10)
    s = growth.founder_state(29, now=0)
    assert (s.wave, s.percent_off, s.seats_left) == (3, 0, 1)
    assert growth.founder_state(30, now=0).open is False


def test_offer_closes_at_fixed_date_for_everyone():
    assert growth.founder_state(0, now=4_000_000_000).open is False


def test_partner_token_is_per_code():
    t = growth.partner_token("LUNA-ALICE")
    assert growth.check_partner_token("LUNA-ALICE", t)
    assert not growth.check_partner_token("LUNA-BOB", t)
    assert growth.normalize_handle("@alice.k!") == "ALICEK"


def test_commission_window():
    assert growth.commission_pct_for_month(0) == 40
    assert growth.commission_pct_for_month(1) == 15
    assert growth.commission_pct_for_month(5) == 15
    assert growth.commission_pct_for_month(6) == 0
    day = 86400
    assert growth.months_paid(None) == 0
    assert growth.months_paid(1000, now=1000 + 29 * day) == 0
    assert growth.months_paid(1000, now=1000 + 31 * day) == 1


def test_unknown_parameter_detection_drives_the_fallback():
    import httpx

    req = httpx.Request("POST", "https://api.stripe.com/v1/promotion_codes")
    unknown = httpx.Response(
        400, request=req,
        json={"error": {"code": "parameter_unknown", "param": "promotion"}},
    )
    other = httpx.Response(
        400, request=req, json={"error": {"code": "resource_missing", "param": "coupon"}},
    )
    err = lambda r: httpx.HTTPStatusError("x", request=req, response=r)  # noqa: E731
    assert growth._is_unknown_parameter(err(unknown), "promotion") is True
    assert growth._is_unknown_parameter(err(other), "promotion") is False
