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


def test_commission_tier():
    assert growth.commission_pct(0) == 25
    assert growth.commission_pct(9) == 25
    assert growth.commission_pct(10) == 30
