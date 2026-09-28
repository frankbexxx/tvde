"""Push de estado ao dono da viagem. A transição não depende do FCM."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.db.models.audit_event import AuditEvent
from app.db.models.device_push_token import DevicePushToken
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import engine
from app.events.dispatcher import emit
from app.models.enums import Role, TripStatus, UserStatus
from app.schemas.realtime import TripStatusChangedEvent
from app.services.device_push_tokens import register_device_token
from app.services.fcm import (
    PASSENGER_PUSH_COPY,
    PASSENGER_TRIP_STATUS_EVENT,
    FcmNotConfigured,
    FcmSendResult,
    push_passenger_trip_status,
)
from tests.support.unique_phone import unique_test_phone

_FORBIDDEN = {
    "lat",
    "lng",
    "latitude",
    "longitude",
    "origin_lat",
    "origin_lng",
    "destination_lat",
    "destination_lng",
    "price",
    "estimated_price",
    "address",
    "name",
    "phone",
    "email",
    "passenger_name",
}
_SILENT = (TripStatus.requested, TripStatus.assigned, TripStatus.queued)


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido: {exc}")


class _Sender:
    def __init__(self, *, invalid: set[str] | None = None, fail: set[str] | None = None) -> None:
        self.calls: list[dict] = []
        self.invalid = invalid or set()
        self.fail = fail or set()

    def send(self, *, token: str, title: str, body: str, data: dict[str, str]) -> FcmSendResult:
        if token in self.fail:
            raise RuntimeError("fcm down")
        self.calls.append({"token": token, "title": title, "body": body, "data": dict(data)})
        invalid = token in self.invalid
        return FcmSendResult(ok=not invalid, invalid_token=invalid)


def _user(db: Session, *, role: Role = Role.passenger, status: UserStatus = UserStatus.active) -> User:
    user = User(
        role=role,
        name=f"pax-push-{uuid.uuid4().hex[:8]}",
        phone=unique_test_phone(),
        status=status,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _token(db: Session, user: User, value: str) -> None:
    register_device_token(db, user_id=user.id, token=value, platform="android")
    db.commit()


def _release(db: Session, trip: Trip) -> None:
    """Um requested sem ofertas desvia o redispatch dos testes de matching."""
    if trip.status != TripStatus.requested:
        return
    trip.status = TripStatus.cancelled
    db.commit()


def _trip(db: Session, passenger: User, *, status: TripStatus = TripStatus.accepted) -> Trip:
    trip = Trip(
        passenger_id=passenger.id,
        status=status,
        origin_lat=38.722,
        origin_lng=-9.139,
        destination_lat=38.731,
        destination_lng=-9.148,
        estimated_price=12.5,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def _event(trip: Trip, status: TripStatus) -> TripStatusChangedEvent:
    return TripStatusChangedEvent(
        trip_id=str(trip.id),
        status=status,
        timestamp=datetime.now(timezone.utc),
    )


def _audit(db: Session, event: TripStatusChangedEvent, times: int) -> None:
    for _ in range(times):
        db.add(
            AuditEvent(
                event_type=event.event,
                entity_type="trip",
                entity_id=event.trip_id,
                payload=event.model_dump(mode="json"),
                occurred_at=event.timestamp,
            )
        )
    db.commit()


@pytest.mark.parametrize("status", list(PASSENGER_PUSH_COPY))
def test_each_passenger_status_sends_one_push(db: Session, status: TripStatus) -> None:
    owner = _user(db, role=Role.driver)
    other = _user(db, role=Role.passenger)
    _token(db, owner, f"pax-status-{status.value}")
    _token(db, other, f"pax-other-{status.value}")
    trip = _trip(db, owner, status=status)
    sender = _Sender()

    push_passenger_trip_status(_event(trip, status), sender=sender, db=db)

    assert len(sender.calls) == 1
    sent = sender.calls[0]
    title, body = PASSENGER_PUSH_COPY[status]
    assert sent["token"] == f"pax-status-{status.value}"
    assert sent["title"] == title
    assert sent["body"] == body
    assert sent["data"] == {
        "event": PASSENGER_TRIP_STATUS_EVENT,
        "trip_id": str(trip.id),
        "status": status.value,
    }
    assert _FORBIDDEN.isdisjoint(sent["data"])
    assert owner.phone not in sent["title"]
    assert owner.phone not in sent["body"]
    assert owner.phone not in str(sent["data"])
    assert "38.722" not in str(sent["data"])
    assert "12.5" not in str(sent["data"])
    _release(db, trip)


@pytest.mark.parametrize("status", _SILENT)
def test_silent_statuses_do_not_push(db: Session, status: TripStatus) -> None:
    owner = _user(db)
    _token(db, owner, f"pax-silent-{status.value}")
    trip = _trip(db, owner, status=status)
    sender = _Sender()

    push_passenger_trip_status(_event(trip, status), sender=sender, db=db)

    assert sender.calls == []
    _release(db, trip)


@pytest.mark.parametrize("role", [Role.driver, Role.partner, Role.admin, Role.super_admin])
def test_elevated_role_owner_still_receives(db: Session, role: Role) -> None:
    owner = _user(db, role=role)
    _token(db, owner, f"pax-role-{role.value}")
    trip = _trip(db, owner)
    sender = _Sender()

    push_passenger_trip_status(_event(trip, TripStatus.accepted), sender=sender, db=db)

    assert [item["token"] for item in sender.calls] == [f"pax-role-{role.value}"]


@pytest.mark.parametrize("status", [UserStatus.blocked, UserStatus.pending])
def test_inactive_owner_receives_nothing(db: Session, status: UserStatus) -> None:
    owner = _user(db, status=status)
    _token(db, owner, f"pax-inactive-{status.value}")
    trip = _trip(db, owner)
    sender = _Sender()

    push_passenger_trip_status(_event(trip, TripStatus.accepted), sender=sender, db=db)

    assert sender.calls == []
    row = db.execute(
        select(DevicePushToken).where(DevicePushToken.token == f"pax-inactive-{status.value}")
    ).scalar_one()
    assert row.active is False


def test_every_active_device_receives(db: Session) -> None:
    owner = _user(db)
    _token(db, owner, "pax-phone")
    _token(db, owner, "pax-tablet")
    trip = _trip(db, owner, status=TripStatus.arriving)
    sender = _Sender()

    push_passenger_trip_status(_event(trip, TripStatus.arriving), sender=sender, db=db)

    assert {item["token"] for item in sender.calls} == {"pax-phone", "pax-tablet"}


def test_invalid_token_becomes_inactive(db: Session) -> None:
    owner = _user(db)
    _token(db, owner, "pax-dead")
    _token(db, owner, "pax-live")
    trip = _trip(db, owner, status=TripStatus.ongoing)
    sender = _Sender(invalid={"pax-dead"})

    push_passenger_trip_status(_event(trip, TripStatus.ongoing), sender=sender, db=db)

    dead = db.execute(select(DevicePushToken).where(DevicePushToken.token == "pax-dead")).scalar_one()
    live = db.execute(select(DevicePushToken).where(DevicePushToken.token == "pax-live")).scalar_one()
    assert dead.active is False
    assert live.active is True


def test_fcm_failure_does_not_raise(db: Session) -> None:
    owner = _user(db)
    _token(db, owner, "pax-down")
    _token(db, owner, "pax-up")
    trip = _trip(db, owner, status=TripStatus.completed)
    sender = _Sender(fail={"pax-down"})

    push_passenger_trip_status(_event(trip, TripStatus.completed), sender=sender, db=db)

    assert [item["token"] for item in sender.calls] == ["pax-up"]


def test_unconfigured_fcm_does_not_raise(db: Session) -> None:
    owner = _user(db)
    _token(db, owner, "pax-unconfigured")
    trip = _trip(db, owner, status=TripStatus.cancelled)

    class _Missing:
        def send(self, *, token: str, title: str, body: str, data: dict[str, str]) -> FcmSendResult:
            raise FcmNotConfigured()

    push_passenger_trip_status(_event(trip, TripStatus.cancelled), sender=_Missing(), db=db)


def test_same_status_is_not_pushed_twice(db: Session) -> None:
    owner = _user(db)
    _token(db, owner, "pax-dedupe")
    trip = _trip(db, owner, status=TripStatus.completed)
    event = _event(trip, TripStatus.completed)
    _audit(db, event, times=1)
    sender = _Sender()

    push_passenger_trip_status(event, sender=sender, db=db)
    assert len(sender.calls) == 1

    _audit(db, event, times=1)
    push_passenger_trip_status(event, sender=sender, db=db)
    assert len(sender.calls) == 1


def test_different_statuses_each_push_once(db: Session) -> None:
    owner = _user(db)
    _token(db, owner, "pax-sequence")
    trip = _trip(db, owner, status=TripStatus.ongoing)
    sender = _Sender()

    for status in (TripStatus.accepted, TripStatus.arriving, TripStatus.ongoing):
        push_passenger_trip_status(_event(trip, status), sender=sender, db=db)

    assert [item["data"]["status"] for item in sender.calls] == ["accepted", "arriving", "ongoing"]


def test_emit_survives_push_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    def boom(event, **kwargs):  # noqa: ANN001
        raise RuntimeError("fcm")

    monkeypatch.setattr("app.services.fcm.push_passenger_trip_status", boom)
    emit(
        TripStatusChangedEvent(
            trip_id=str(uuid.uuid4()),
            status=TripStatus.failed,
            timestamp=datetime.now(timezone.utc),
        )
    )


def test_emit_pushes_once_when_the_event_is_repeated(db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    owner = _user(db)
    _token(db, owner, "pax-emit-once")
    trip = _trip(db, owner, status=TripStatus.failed)
    sender = _Sender()
    from app.services import fcm as fcm_mod

    original = fcm_mod.push_passenger_trip_status
    injected = sender

    def wrapped(event, **kwargs):  # noqa: ANN001, ARG001
        return original(event, sender=injected, db=None)

    monkeypatch.setattr(fcm_mod, "push_passenger_trip_status", wrapped)
    event = _event(trip, TripStatus.failed)

    emit(event)
    emit(event)

    assert len(sender.calls) == 1
    assert sender.calls[0]["data"]["status"] == "failed"
