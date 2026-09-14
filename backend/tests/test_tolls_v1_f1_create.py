"""PORTAGENS V1 F1 — create estimate wiring + snapshot + commission."""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.pricing import calculate_commission_amount, calculate_fare_breakdown, money
from app.core.tariffs import TARIFF_GO
from app.db.models.user import User
from app.models.enums import Role, UserStatus
from app.schemas.trip import TripCreateRequest
from app.services.tolls.here import TollEstimateResult, TollFareInfo
from app.services.tolls.snapshot import (
    build_create_toll_snapshot,
    charged_amount_from_estimate,
    merge_toll_snapshot,
)
from app.services.trips import create_trip


ORIGIN = (38.6910, -9.3110)
DEST = (38.7742, -9.1342)


def _passenger(db: Session) -> str:
    user = User(
        role=Role.passenger,
        name=f"Pax {uuid.uuid4()}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(user)
    db.commit()
    return str(user.id)


def _ok_result(amount: Decimal, system: str = "BRISA") -> TollEstimateResult:
    return TollEstimateResult(
        amount=amount,
        currency="EUR",
        source="here",
        status="ok",
        calculated_at=datetime.now(timezone.utc),
        systems=(system,),
        fares=(
            TollFareInfo(
                name=f"{system} fare",
                currency="EUR",
                value=float(amount),
                toll_system=system,
                payment_methods=("transponder",),
                fare_id="unstable-id",
            ),
        ),
        http_status=200,
        latency_ms=42,
        error_code=None,
    )


def _stub_osrm(monkeypatch: pytest.MonkeyPatch, km: float = 10.0, mins: float = 15.0) -> None:
    monkeypatch.setattr(
        "app.services.osrm.get_route_distance_duration",
        lambda *a, **k: (km, mins),
        raising=False,
    )


def test_charged_equals_estimated_on_ok() -> None:
    r = _ok_result(Decimal("0.40"))
    assert charged_amount_from_estimate(r) == Decimal("0.40")
    snap = build_create_toll_snapshot(r)
    assert snap["estimated_tolls_amount"] == 0.4
    assert snap["charged_tolls_amount"] == 0.4
    assert snap["tolls_status"] == "ok"
    assert "fare_id" not in snap["tolls_fares"][0]
    assert "unstable-id" not in str(snap)


def test_error_maps_to_zero_fallback() -> None:
    r = TollEstimateResult(
        amount=Decimal("0.00"),
        currency="EUR",
        source="here",
        status="error",
        calculated_at=datetime.now(timezone.utc),
        error_code="here_timeout",
    )
    assert charged_amount_from_estimate(r) == Decimal("0.00")
    snap = build_create_toll_snapshot(r)
    assert snap["tolls_status"] == "zero_fallback"
    assert snap["charged_tolls_amount"] == 0.0
    assert snap["tolls_error_code"] == "here_timeout"


def test_merge_preserves_legacy_and_meta() -> None:
    legacy = {"fare_subtotal": 4.5, "total": 4.5, "tolls_amount": 0.0}
    out = merge_toll_snapshot(legacy, prior=None, toll_meta=None)
    assert out["tolls_amount"] == 0.0
    assert "estimated_tolls_amount" not in out

    with_meta = merge_toll_snapshot(
        {"fare_subtotal": 5.0, "total": 5.4, "tolls_amount": 0.4},
        toll_meta={"estimated_tolls_amount": 0.4, "charged_tolls_amount": 0.4},
    )
    assert with_meta["estimated_tolls_amount"] == 0.4


def test_create_flag_off_no_here_http(db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENABLE_HERE_TOLLS", False, raising=False)
    monkeypatch.setattr(settings, "HERE_API_KEY", "secret-should-not-leak", raising=False)
    _stub_osrm(monkeypatch)
    calls = {"n": 0}
    real = __import__("app.services.tolls.here", fromlist=["estimate_tolls"]).estimate_tolls

    def wrapped(*a, **k):
        calls["n"] += 1
        return real(*a, **k)

    monkeypatch.setattr("app.services.tolls.here.estimate_tolls", wrapped)

    pax = _passenger(db)
    payload = TripCreateRequest(
        origin_lat=ORIGIN[0],
        origin_lng=ORIGIN[1],
        destination_lat=DEST[0],
        destination_lng=DEST[1],
    )
    trip, _eta = asyncio.run(create_trip(db=db, passenger_id=pax, payload=payload))
    db.refresh(trip)
    bd = trip.price_breakdown
    assert calls["n"] == 1  # client invoked, but returns flag_off without HTTP
    assert float(trip.estimated_price) == float(bd["total"])
    assert bd["tolls_amount"] == 0.0
    assert bd["charged_tolls_amount"] == 0.0
    assert bd["estimated_tolls_amount"] == 0.0
    assert bd["tolls_status"] == "flag_off"
    assert "secret-should-not-leak" not in str(bd)


def test_create_brisa_mock(db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENABLE_HERE_TOLLS", True, raising=False)
    monkeypatch.setattr(settings, "HERE_API_KEY", "k", raising=False)
    _stub_osrm(monkeypatch)
    monkeypatch.setattr(
        "app.services.tolls.here.estimate_tolls",
        lambda *a, **k: _ok_result(Decimal("0.40"), "BRISA"),
    )
    pax = _passenger(db)
    payload = TripCreateRequest(
        origin_lat=ORIGIN[0],
        origin_lng=ORIGIN[1],
        destination_lat=DEST[0],
        destination_lng=DEST[1],
    )
    trip, _ = asyncio.run(create_trip(db=db, passenger_id=pax, payload=payload))
    db.refresh(trip)
    bd = trip.price_breakdown
    assert bd["tolls_amount"] == 0.4
    assert bd["estimated_tolls_amount"] == 0.4
    assert bd["charged_tolls_amount"] == 0.4
    assert bd["estimated_tolls_amount"] == bd["charged_tolls_amount"]
    assert "BRISA" in bd["tolls_systems"]
    fare_only = calculate_fare_breakdown(10.0, 15.0, category="x", pet_surcharge=0)
    assert float(trip.estimated_price) == pytest.approx(float(fare_only.total) + 0.4)
    assert float(trip.estimated_price) == float(bd["total"])
    commission = calculate_commission_amount(
        float(trip.estimated_price), Decimal("0.15"), tolls_amount=bd["tolls_amount"]
    )
    expected_comm = money(
        (Decimal(str(trip.estimated_price)) - Decimal("0.40")) * Decimal("0.15")
    )
    assert commission == expected_comm


def test_create_lusoponte_mock(db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENABLE_HERE_TOLLS", True, raising=False)
    monkeypatch.setattr(settings, "HERE_API_KEY", "k", raising=False)
    _stub_osrm(monkeypatch)
    monkeypatch.setattr(
        "app.services.tolls.here.estimate_tolls",
        lambda *a, **k: _ok_result(Decimal("2.25"), "LUSOPONTE"),
    )
    pax = _passenger(db)
    trip, _ = asyncio.run(
        create_trip(
            db=db,
            passenger_id=pax,
            payload=TripCreateRequest(
                origin_lat=38.6780,
                origin_lng=-9.1600,
                destination_lat=38.7030,
                destination_lng=-9.1750,
            ),
        )
    )
    db.refresh(trip)
    assert trip.price_breakdown["tolls_amount"] == 2.25
    assert "LUSOPONTE" in trip.price_breakdown["tolls_systems"]


def test_create_no_tolls(db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENABLE_HERE_TOLLS", True, raising=False)
    monkeypatch.setattr(settings, "HERE_API_KEY", "k", raising=False)
    _stub_osrm(monkeypatch)
    monkeypatch.setattr(
        "app.services.tolls.here.estimate_tolls",
        lambda *a, **k: TollEstimateResult(
            amount=Decimal("0.00"),
            currency="EUR",
            source="here",
            status="no_tolls",
            calculated_at=datetime.now(timezone.utc),
            http_status=200,
            latency_ms=10,
        ),
    )
    pax = _passenger(db)
    trip, _ = asyncio.run(
        create_trip(
            db=db,
            passenger_id=pax,
            payload=TripCreateRequest(
                origin_lat=ORIGIN[0],
                origin_lng=ORIGIN[1],
                destination_lat=DEST[0],
                destination_lng=DEST[1],
            ),
        )
    )
    db.refresh(trip)
    assert trip.price_breakdown["tolls_amount"] == 0.0
    assert trip.price_breakdown["tolls_status"] == "no_tolls"


@pytest.mark.parametrize(
    "error_code",
    ["here_timeout", "here_auth_error", "here_rate_limited", "here_http_5xx"],
)
def test_create_here_error_continues(
    db: Session, monkeypatch: pytest.MonkeyPatch, error_code: str
) -> None:
    monkeypatch.setattr(settings, "ENABLE_HERE_TOLLS", True, raising=False)
    monkeypatch.setattr(settings, "HERE_API_KEY", "k", raising=False)
    _stub_osrm(monkeypatch)
    monkeypatch.setattr(
        "app.services.tolls.here.estimate_tolls",
        lambda *a, **k: TollEstimateResult(
            amount=Decimal("0.00"),
            currency="EUR",
            source="here",
            status="error",
            calculated_at=datetime.now(timezone.utc),
            error_code=error_code,
            http_status=500 if "5xx" in error_code else 401,
        ),
    )
    pax = _passenger(db)
    trip, _ = asyncio.run(
        create_trip(
            db=db,
            passenger_id=pax,
            payload=TripCreateRequest(
                origin_lat=ORIGIN[0],
                origin_lng=ORIGIN[1],
                destination_lat=DEST[0],
                destination_lng=DEST[1],
            ),
        )
    )
    db.refresh(trip)
    assert trip.id is not None
    assert trip.price_breakdown["tolls_amount"] == 0.0
    assert trip.price_breakdown["charged_tolls_amount"] == 0.0
    assert trip.price_breakdown["tolls_status"] == "zero_fallback"
    assert trip.price_breakdown["tolls_error_code"] == error_code


def test_create_with_pet_and_tolls(db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENABLE_HERE_TOLLS", True, raising=False)
    monkeypatch.setattr(settings, "HERE_API_KEY", "k", raising=False)
    _stub_osrm(monkeypatch)
    monkeypatch.setattr(
        "app.services.tolls.here.estimate_tolls",
        lambda *a, **k: _ok_result(Decimal("1.60"), "BRISA"),
    )
    pax = _passenger(db)
    trip, _ = asyncio.run(
        create_trip(
            db=db,
            passenger_id=pax,
            payload=TripCreateRequest(
                origin_lat=ORIGIN[0],
                origin_lng=ORIGIN[1],
                destination_lat=DEST[0],
                destination_lng=DEST[1],
                has_pet=True,
                pet_size="small",
                pet_transport="carrier",
            ),
        )
    )
    db.refresh(trip)
    bd = trip.price_breakdown
    assert bd["pet_surcharge"] == 1.5
    assert bd["tolls_amount"] == 1.6
    assert bd["total"] == pytest.approx(bd["fare_subtotal"] + 1.5 + 1.6)
    assert float(trip.estimated_price) == float(bd["total"])


def test_legacy_breakdown_from_json_without_toll_meta() -> None:
    from app.core.pricing import PriceBreakdown

    raw = {
        "category": "x",
        "tariff_version": "v1",
        "base_fare": float(TARIFF_GO.base_fare),
        "price_per_km": float(TARIFF_GO.price_per_km),
        "price_per_min": float(TARIFF_GO.price_per_min),
        "distance_amount": 0.0,
        "duration_amount": 0.0,
        "minimum_fare": float(TARIFF_GO.minimum_fare),
        "minimum_fare_adjustment": float(TARIFF_GO.minimum_fare - TARIFF_GO.base_fare),
        "pet_surcharge": 0.0,
        "tolls_amount": 0.0,
        "fare_subtotal": float(TARIFF_GO.minimum_fare),
        "total": float(TARIFF_GO.minimum_fare),
        "pet_surcharge_rule": "pet_surcharge_v1",
    }
    bd = PriceBreakdown.from_json_dict(raw)
    assert bd is not None
    assert bd.tolls_amount == Decimal("0.00")
