"""Voice AiLunaPro: the plan catalog read from Stripe products and prices."""

import asyncio

from api.services.billing import plans as plans_mod

PRODUCTS = {
    "data": [
        {"id": "prod_S", "name": "AiLunaPro Voice — Starter"},
        {"id": "prod_P", "name": "AiLunaPro Voice — Pro"},
        {"id": "prod_X", "name": "Something else"},
    ]
}
PRICES = {
    "data": [
        {"id": "price_S", "product": "prod_S", "currency": "eur", "unit_amount": 4900,
         "recurring": {"interval": "month", "usage_type": "licensed"}},
        {"id": "price_S_m", "product": "prod_S", "currency": "eur",
         "recurring": {"interval": "month", "usage_type": "metered"},
         "tiers": [{"up_to": 300, "unit_amount": 0, "flat_amount": 0},
                   {"up_to": None, "unit_amount_decimal": "9"}]},
        {"id": "price_P", "product": "prod_P", "currency": "eur", "unit_amount": 14900,
         "recurring": {"interval": "month", "usage_type": "licensed"}},
        {"id": "price_X", "product": "prod_X", "currency": "eur", "unit_amount": 100,
         "recurring": {"interval": "month", "usage_type": "licensed"}},
    ]
}


def test_catalog_keeps_only_prefixed_products_and_reads_tiers(monkeypatch):
    async def fake_get(path):
        return PRODUCTS if path.startswith("/v1/products") else PRICES

    import api.services.billing.stripe_billing as sb

    monkeypatch.setattr(sb, "_get", fake_get)
    monkeypatch.setattr(plans_mod, "_cache", None)

    plans = asyncio.run(plans_mod.list_plans(refresh=True))
    assert [p.name for p in plans] == ["Starter", "Pro"]
    starter = plans[0]
    assert starter.included_minutes == 300
    assert starter.overage_per_minute == "9"
    assert starter.metered_price_id == "price_S_m"
    assert "base_price_id" not in starter.public()

    # Not one of our plans, so it can never be checked out.
    assert asyncio.run(plans_mod.plan_by_id("prod_X")) is None
    assert asyncio.run(plans_mod.plan_for_price("price_S_m")).id == "prod_S"


def test_overage_on_its_own_product_is_linked_and_preferred(monkeypatch):
    products = {
        "data": [
            {"id": "prod_P", "name": "AiLunaPro Voice — Pro"},
            {"id": "prod_P_o", "name": "AiLunaPro Voice — Minutes supplémentaires Pro",
             "metadata": {"overage_for": "prod_P"}},
        ]
    }
    prices = {
        "data": [
            {"id": "price_P", "product": "prod_P", "currency": "eur", "unit_amount": 14900,
             "recurring": {"interval": "month", "usage_type": "licensed"}},
            # Legacy metered price still on the plan product: the linked one wins.
            {"id": "price_P_old", "product": "prod_P", "currency": "eur",
             "recurring": {"interval": "month", "usage_type": "metered"},
             "tiers": [{"up_to": 100, "unit_amount": 0}, {"up_to": None, "unit_amount": 99}]},
            {"id": "price_P_o", "product": "prod_P_o", "currency": "eur",
             "recurring": {"interval": "month", "usage_type": "metered"},
             "tiers": [{"up_to": 1500, "unit_amount": 0, "flat_amount": 0},
                       {"up_to": None, "unit_amount_decimal": "11"}]},
        ]
    }

    async def fake_get(path):
        return products if path.startswith("/v1/products") else prices

    import api.services.billing.stripe_billing as sb

    monkeypatch.setattr(sb, "_get", fake_get)
    monkeypatch.setattr(plans_mod, "_cache", None)

    plans = asyncio.run(plans_mod.list_plans(refresh=True))
    assert [p.id for p in plans] == ["prod_P"]  # the overage product is not a plan
    pro = plans[0]
    assert pro.metered_price_id == "price_P_o"
    assert (pro.included_minutes, pro.overage_per_minute) == (1500, "11")
    assert asyncio.run(plans_mod.plan_for_price("price_P_o")).id == "prod_P"
