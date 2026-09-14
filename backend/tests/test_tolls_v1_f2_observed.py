"""PORTAGENS V1 F2 — observed tolls on complete (audit only; billing frozen)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.partner_constants import DEFAULT_PARTNER_UUID
from app.core.pricing import calculate_commission_amount, calculate_fare_breakdown
from app.db.models.driver import Driver
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.db.models.user import User
from app.models.enums import DriverStatus, PaymentStatus, Role, TripStatus, UserStatus
from app.services.tolls.here import TollEstimateResult, TollFareInfo
from app.services.tolls.snapshot import (
    build_observed_toll_snapshot,
    resolve_charged_tolls_from_breakdown,
)
from app.services import trips as trip_service


def _ok(amount: Decimal, system: str = "BRISA") -> TollEstimateResult:
    return TollEstimateResult(
        amount=amount,
        currency="EUR",
        source="here",
        status="ok",
        calculated_at=datetime.now(timezone.utc),
        systems=(system,),
        fares=(
            TollFareInfo(
                name=f"{system}",
                currency="EUR",
                value=float(amount),
                toll_system=system,
                payment_methods=("transponder",),
            ),
        ),
        http_status=200,
        latency_ms=33,
    )


def _ongoing_trip(
    db: Session,
    *,
    charged_tolls: float = 0.40,
    with_create_snapshot: bool = True,
) -> tuple[str, str]:
    passenger = User(
        role=Role.passenger,
        name=f"Pax {uuid.uuid4()}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(passenger)
    db.flush()
    driver_user = User(
        role=Role.driver,
        name=f"Drv {uuid.uuid4()}",
        phone=f"+3519{uuid.uuid4().int % 10_000_000:07d}",
        status=UserStatus.active,
    )
    db.add(driver_user)
    db.flush()
    driver = Driver(
        partner_id=DEFAULT_PARTNER_UUID,
        user_id=driver_user.id,
        status=DriverStatus.approved,
        commission_percent=15.0,
        is_available=False,
    )
    db.add(driver)
    db.flush()

    fare = calculate_fare_breakdown(
        10.0, 15.0, category="x", pet_surcharge=0, tolls_amount=charged_tolls
    )
    breakdown = fare.to_json_dict()
    if with_create_snapshot:
        breakdown.update(
            {
                "estimated_tolls_amount": charged_tolls,
                "charged_tolls_amount": charged_tolls,
                "tolls_source": "here",
                "tolls_status": "ok" if charged_tolls > 0 else "zero_fallback",
                "tolls_calculated_at": datetime.now(timezone.utc).isoformat(),
                "tolls_systems": ["BRISA"] if charged_tolls > 0 else [],
                "tolls_fares": [],
                "tolls_http_status": 200 if charged_tolls > 0 else None,
                "tolls_latency_ms": 10,
                "tolls_error_code": None if charged_tolls > 0 else "here_timeout",
            }
        )

    trip = Trip(
        passenger_id=passenger.id,
        driver_id=driver_user.id,
        status=TripStatus.ongoing,
        origin_lat=38.6910,
        origin_lng=-9.3110,
        destination_lat=38.7742,
        destination_lng=-9.1342,
        estimated_price=float(fare.total),
        distance_km=10.0,
        duration_min=15.0,
        price_breakdown=breakdown,
        pet_surcharge_amount=0.0,
        pet_surcharge_rule="pet_surcharge_v1",
        vehicle_category="x",
    )
    db.add(trip)
    db.flush()
    payment = Payment(
        trip_id=trip.id,
        total_amount=0.50,
        commission_amount=0.08,
        driver_amount=0.42,
        currency="EUR",
        status=PaymentStatus.processing,
        stripe_payment_intent_id=f"pi_mock_{uuid.uuid4().hex[:16]}",
    )
    db.add(payment)
    db.commit()
    return str(driver_user.id), str(trip.id)


def test_resolve_charged_prefers_charged_field() -> None:
    assert resolve_charged_tolls_from_breakdown(
        {"charged_tolls_amount": 1.6, "tolls_amount": 9.9}
    ) == Decimal("1.60")
    assert resolve_charged_tolls_from_breakdown({"tolls_amount": 0.4}) == Decimal("0.40")
    assert resolve_charged_tolls_from_breakdown(None) == Decimal("0.00")
    assert resolve_charged_tolls_from_breakdown({}) == Decimal("0.00")


def test_observed_delta_positive_negative() -> None:
    charged = Decimal("0.40")
    hi = build_observed_toll_snapshot(_ok(Decimal("1.00")), charged_tolls_amount=charged)
    assert hi["observed_tolls_amount"] == 1.0
    assert hi["observed_tolls_delta"] == 0.6
    lo = build_observed_toll_snapshot(_ok(Decimal("0.10")), charged_tolls_amount=charged)
    assert lo["observed_tolls_delta"] == -0.3


def test_complete_flag_off(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENABLE_HERE_TOLLS", False, raising=False)
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    calls = {"n": 0}
    from app.services.tolls import here as here_mod

    real = here_mod.estimate_tolls

    def wrapped(*a, **k):
        calls["n"] += 1
        return real(*a, **k)

    monkeypatch.setattr("app.services.tolls.here.estimate_tolls", wrapped)
    driver_id, trip_id = _ongoing_trip(db, charged_tolls=0.40)
    completed = trip_service.complete_trip(db=db, driver_id=driver_id, trip_id=trip_id)
    assert completed.status == TripStatus.completed
    bd = completed.price_breakdown
    assert calls["n"] == 1
    assert bd["charged_tolls_amount"] == 0.4
    assert bd["tolls_amount"] == 0.4
    assert bd["observed_tolls_status"] == "flag_off"
    assert bd["observed_tolls_amount"] is None
    assert float(completed.final_price) == pytest.approx(
        float(calculate_fare_breakdown(10, 15, category="x", tolls_amount=0.4).total)
    )


@pytest.mark.parametrize(
    "observed_amt,expected_delta",
    [
        (Decimal("0.40"), 0.0),
        (Decimal("2.25"), 1.85),
        (Decimal("0.10"), -0.3),
        (Decimal("0.00"), -0.4),
    ],
)
def test_complete_observed_vs_charged(
    db: Session,
    monkeypatch: pytest.MonkeyPatch,
    observed_amt: Decimal,
    expected_delta: float,
) -> None:
    monkeypatch.setattr(settings, "ENABLE_HERE_TOLLS", True, raising=False)
    monkeypatch.setattr(settings, "HERE_API_KEY", "k", raising=False)
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    status = "no_tolls" if observed_amt == 0 else "ok"
    result = TollEstimateResult(
        amount=observed_amt,
        currency="EUR",
        source="here",
        status=status,  # type: ignore[arg-type]
        calculated_at=datetime.now(timezone.utc),
        systems=("BRISA",) if observed_amt > 0 else (),
        http_status=200,
        latency_ms=12,
    )
    monkeypatch.setattr(
        "app.services.tolls.here.estimate_tolls",
        lambda *a, **k: result,
    )
    charged = 0.40
    driver_id, trip_id = _ongoing_trip(db, charged_tolls=charged)
    completed = trip_service.complete_trip(db=db, driver_id=driver_id, trip_id=trip_id)
    bd = completed.price_breakdown
    assert bd["charged_tolls_amount"] == charged
    assert bd["tolls_amount"] == charged
    assert bd["observed_tolls_amount"] == float(observed_amt)
    assert bd["observed_tolls_delta"] == pytest.approx(expected_delta)
    expected_total = float(
        calculate_fare_breakdown(10, 15, category="x", tolls_amount=charged).total
    )
    assert float(completed.final_price) == pytest.approx(expected_total)
    payment = db.execute(
        select(Payment).where(Payment.trip_id == completed.id)
    ).scalar_one()
    assert float(payment.total_amount) == pytest.approx(expected_total)
    commission = calculate_commission_amount(
        expected_total, Decimal("0.15"), tolls_amount=charged
    )
    assert float(payment.commission_amount) == pytest.approx(float(commission))


@pytest.mark.parametrize(
    "error_code",
    ["here_timeout", "here_auth_error", "here_rate_limited", "here_http_5xx"],
)
def test_complete_here_error_keeps_charged(
    db: Session, monkeypatch: pytest.MonkeyPatch, error_code: str
) -> None:
    monkeypatch.setattr(settings, "ENABLE_HERE_TOLLS", True, raising=False)
    monkeypatch.setattr(settings, "HERE_API_KEY", "k", raising=False)
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    monkeypatch.setattr(
        "app.services.tolls.here.estimate_tolls",
        lambda *a, **k: TollEstimateResult(
            amount=Decimal("0.00"),
            currency="EUR",
            source="here",
            status="error",
            calculated_at=datetime.now(timezone.utc),
            error_code=error_code,
            http_status=500,
            latency_ms=99,
        ),
    )
    driver_id, trip_id = _ongoing_trip(db, charged_tolls=0.40)
    completed = trip_service.complete_trip(db=db, driver_id=driver_id, trip_id=trip_id)
    bd = completed.price_breakdown
    assert bd["charged_tolls_amount"] == 0.4
    assert bd["observed_tolls_status"] == "error"
    assert bd["observed_tolls_error_code"] == error_code
    assert bd["observed_tolls_amount"] is None
    assert bd["observed_tolls_delta"] is None
    assert float(completed.final_price) == pytest.approx(
        float(calculate_fare_breakdown(10, 15, category="x", tolls_amount=0.4).total)
    )


def test_create_charged_zero_observed_positive_still_charges_zero(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENABLE_HERE_TOLLS", True, raising=False)
    monkeypatch.setattr(settings, "HERE_API_KEY", "k", raising=False)
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    monkeypatch.setattr(
        "app.services.tolls.here.estimate_tolls",
        lambda *a, **k: _ok(Decimal("2.25"), "LUSOPONTE"),
    )
    driver_id, trip_id = _ongoing_trip(db, charged_tolls=0.0)
    completed = trip_service.complete_trip(db=db, driver_id=driver_id, trip_id=trip_id)
    bd = completed.price_breakdown
    assert bd["charged_tolls_amount"] == 0.0
    assert bd["tolls_amount"] == 0.0
    assert bd["observed_tolls_amount"] == 2.25
    assert bd["observed_tolls_delta"] == 2.25
    assert float(completed.final_price) == pytest.approx(
        float(calculate_fare_breakdown(10, 15, category="x", tolls_amount=0).total)
    )


def test_complete_legacy_without_snapshot(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENABLE_HERE_TOLLS", True, raising=False)
    monkeypatch.setattr(settings, "HERE_API_KEY", "k", raising=False)
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    monkeypatch.setattr(
        "app.services.tolls.here.estimate_tolls",
        lambda *a, **k: _ok(Decimal("0.40")),
    )
    driver_id, trip_id = _ongoing_trip(
        db, charged_tolls=0.0, with_create_snapshot=False
    )
    # Force legacy-style breakdown (fare only, no charged_* keys beyond tolls_amount 0)
    trip = db.get(Trip, uuid.UUID(trip_id))
    assert trip is not None
    trip.price_breakdown = calculate_fare_breakdown(
        10, 15, category="x", tolls_amount=0
    ).to_json_dict()
    db.commit()
    completed = trip_service.complete_trip(db=db, driver_id=driver_id, trip_id=trip_id)
    assert completed.status == TripStatus.completed
    assert float(completed.final_price) == pytest.approx(
        float(calculate_fare_breakdown(10, 15, category="x", tolls_amount=0).total)
    )
    assert completed.price_breakdown.get("observed_tolls_amount") == 0.4


def test_api_key_not_in_observed_snapshot() -> None:
    secret = "super-secret-key"
    r = _ok(Decimal("0.40"))
    snap = build_observed_toll_snapshot(r, charged_tolls_amount=Decimal("0.40"))
    assert secret not in str(snap)
    assert "apiKey" not in str(snap).lower()


def test_complete_logs_observed_event(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENABLE_HERE_TOLLS", True, raising=False)
    monkeypatch.setattr(settings, "HERE_API_KEY", "secret-key-xyz", raising=False)
    monkeypatch.setattr(settings, "STRIPE_MOCK", True, raising=False)
    monkeypatch.setattr(
        "app.services.tolls.here.estimate_tolls",
        lambda *a, **k: _ok(Decimal("0.40")),
    )
    events: list[tuple[str, dict]] = []

    def capture(name: str, **fields):
        events.append((name, fields))

    monkeypatch.setattr("app.services.trips.log_event", capture)
    driver_id, trip_id = _ongoing_trip(db, charged_tolls=0.40)
    trip_service.complete_trip(db=db, driver_id=driver_id, trip_id=trip_id)
    observed_events = [e for e in events if e[0] == "trip_tolls_observed"]
    assert len(observed_events) == 1
    payload = observed_events[0][1]
    assert payload["charged_tolls_amount"] == 0.4
    assert payload["observed_tolls_amount"] == 0.4
    assert payload["delta"] == 0.0
    assert payload["status"] == "ok"
    assert "secret-key-xyz" not in str(payload)
