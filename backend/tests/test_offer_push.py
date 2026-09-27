"""Push da oferta já criada. O matching não depende do FCM."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.db.models.device_push_token import DevicePushToken
from app.db.models.user import User
from app.db.session import engine
from app.models.enums import Role, UserStatus
from app.services.device_push_tokens import register_device_token
from app.services.fcm import (
    DRIVER_OFFER_NOTIFICATION_BODY,
    DRIVER_OFFER_NOTIFICATION_TITLE,
    FcmNotConfigured,
    FcmSendResult,
    push_committed_offers,
)
from app.services.offer_dispatch import publish_trip_offers
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


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido: {exc}")


class _Trip:
    def __init__(self, passenger_id: uuid.UUID) -> None:
        self.id = uuid.uuid4()
        self.passenger_id = passenger_id


class _Offer:
    def __init__(self, driver_id: uuid.UUID, trip_id: uuid.UUID) -> None:
        self.id = uuid.uuid4()
        self.driver_id = driver_id
        self.trip_id = trip_id


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


def _user(db: Session, *, role: Role = Role.driver, status: UserStatus = UserStatus.active) -> User:
    user = User(
        role=role,
        name=f"offer-push-{uuid.uuid4().hex[:8]}",
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


def test_new_offer_pushes_only_the_recipient(db: Session) -> None:
    passenger = _user(db, role=Role.passenger)
    driver = _user(db)
    other = _user(db)
    _token(db, driver, "offer-token-driver")
    _token(db, other, "offer-token-other")
    _token(db, passenger, "offer-token-passenger")
    trip = _Trip(passenger.id)
    offer = _Offer(driver.id, trip.id)
    sender = _Sender()

    push_committed_offers([offer], trip, sender=sender, db=db)

    assert [item["token"] for item in sender.calls] == ["offer-token-driver"]
    sent = sender.calls[0]
    assert sent["title"] == DRIVER_OFFER_NOTIFICATION_TITLE
    assert sent["body"] == DRIVER_OFFER_NOTIFICATION_BODY
    assert sent["data"] == {
        "event": "new_trip_offer",
        "trip_id": str(trip.id),
        "offer_id": str(offer.id),
    }
    assert _FORBIDDEN.isdisjoint(sent["data"])
    assert driver.name not in sent["title"]
    assert driver.phone not in sent["body"]
    assert passenger.phone not in str(sent["data"])


def test_blocked_driver_receives_nothing(db: Session) -> None:
    passenger = _user(db, role=Role.passenger)
    driver = _user(db, status=UserStatus.blocked)
    _token(db, driver, "offer-token-blocked")
    sender = _Sender()

    push_committed_offers([_Offer(driver.id, uuid.uuid4())], _Trip(passenger.id), sender=sender, db=db)

    assert sender.calls == []
    row = db.execute(select(DevicePushToken).where(DevicePushToken.token == "offer-token-blocked")).scalar_one()
    assert row.active is False


def test_missing_token_does_not_fail(db: Session) -> None:
    passenger = _user(db, role=Role.passenger)
    driver = _user(db)
    sender = _Sender()

    push_committed_offers([_Offer(driver.id, uuid.uuid4())], _Trip(passenger.id), sender=sender, db=db)

    assert sender.calls == []


def test_two_active_tokens_both_receive(db: Session) -> None:
    passenger = _user(db, role=Role.passenger)
    driver = _user(db)
    _token(db, driver, "offer-token-phone")
    _token(db, driver, "offer-token-tablet")
    sender = _Sender()

    push_committed_offers([_Offer(driver.id, uuid.uuid4())], _Trip(passenger.id), sender=sender, db=db)

    assert {item["token"] for item in sender.calls} == {"offer-token-phone", "offer-token-tablet"}


def test_logged_out_device_is_skipped(db: Session) -> None:
    passenger = _user(db, role=Role.passenger)
    driver = _user(db)
    _token(db, driver, "offer-token-kept")
    _token(db, driver, "offer-token-logged-out")
    logged_out = db.execute(
        select(DevicePushToken).where(DevicePushToken.token == "offer-token-logged-out")
    ).scalar_one()
    logged_out.active = False
    db.commit()
    sender = _Sender()

    push_committed_offers([_Offer(driver.id, uuid.uuid4())], _Trip(passenger.id), sender=sender, db=db)

    assert [item["token"] for item in sender.calls] == ["offer-token-kept"]


def test_invalid_token_becomes_inactive(db: Session) -> None:
    passenger = _user(db, role=Role.passenger)
    driver = _user(db)
    _token(db, driver, "offer-token-dead")
    _token(db, driver, "offer-token-live")
    sender = _Sender(invalid={"offer-token-dead"})

    push_committed_offers([_Offer(driver.id, uuid.uuid4())], _Trip(passenger.id), sender=sender, db=db)

    dead = db.execute(select(DevicePushToken).where(DevicePushToken.token == "offer-token-dead")).scalar_one()
    live = db.execute(select(DevicePushToken).where(DevicePushToken.token == "offer-token-live")).scalar_one()
    assert dead.active is False
    assert live.active is True
    assert {item["token"] for item in sender.calls} == {"offer-token-dead", "offer-token-live"}


def test_fcm_failure_does_not_raise(db: Session) -> None:
    passenger = _user(db, role=Role.passenger)
    driver = _user(db)
    _token(db, driver, "offer-token-down")
    _token(db, driver, "offer-token-up")
    sender = _Sender(fail={"offer-token-down"})

    push_committed_offers([_Offer(driver.id, uuid.uuid4())], _Trip(passenger.id), sender=sender, db=db)

    assert [item["token"] for item in sender.calls] == ["offer-token-up"]


def test_self_trip_does_not_push(db: Session) -> None:
    driver = _user(db)
    _token(db, driver, "offer-token-self")
    sender = _Sender()

    push_committed_offers([_Offer(driver.id, uuid.uuid4())], _Trip(driver.id), sender=sender, db=db)

    assert sender.calls == []
    row = db.execute(select(DevicePushToken).where(DevicePushToken.token == "offer-token-self")).scalar_one()
    assert row.active is True


def test_partner_does_not_receive_offer_push(db: Session) -> None:
    passenger = _user(db, role=Role.passenger)
    partner = _user(db, role=Role.partner)
    _token(db, partner, "offer-token-partner")
    sender = _Sender()

    push_committed_offers([_Offer(partner.id, uuid.uuid4())], _Trip(passenger.id), sender=sender, db=db)

    assert sender.calls == []


def test_unconfigured_fcm_does_not_raise(db: Session) -> None:
    passenger = _user(db, role=Role.passenger)
    driver = _user(db)
    _token(db, driver, "offer-token-unconfigured")

    class _Missing:
        def send(self, *, token: str, title: str, body: str, data: dict[str, str]) -> FcmSendResult:
            raise FcmNotConfigured()

    push_committed_offers([_Offer(driver.id, uuid.uuid4())], _Trip(passenger.id), sender=_Missing(), db=db)


def test_publish_survives_push_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    def boom(offers, trip, **kwargs):  # noqa: ANN001
        raise RuntimeError("fcm")

    monkeypatch.setattr("app.services.fcm.push_committed_offers", boom)
    trip = _Trip(uuid.uuid4())
    trip.origin_lat = 0
    trip.origin_lng = 0
    trip.destination_lat = 0
    trip.destination_lng = 0
    trip.estimated_price = 1
    offer = _Offer(uuid.uuid4(), trip.id)
    offer.expires_at = datetime.now(timezone.utc)

    publish_trip_offers(offers=[offer], trip=trip)  # type: ignore[arg-type]
