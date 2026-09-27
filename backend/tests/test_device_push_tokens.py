"""Device push token lifecycle. Tokens are asserted, never logged."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.security import create_access_token
from app.db.models.device_push_token import DevicePushToken
from app.db.models.user import User
from app.db.session import engine
from app.models.enums import Role, UserStatus
from app.services.device_push_tokens import active_tokens_for_user
from app.services.fcm import FcmSendResult, deliver_user_push, outcome_from_fcm_response, sanitize_data
from tests.support.unique_phone import unique_test_phone


@pytest.fixture(scope="module", autouse=True)
def _require_postgres() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL requerido: {exc}")


def _user(db: Session, *, status: UserStatus = UserStatus.active) -> User:
    user = User(
        role=Role.driver,
        name=f"push-{uuid.uuid4().hex[:8]}",
        phone=unique_test_phone(),
        status=status,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _auth(user: User) -> dict[str, str]:
    token = create_access_token(subject=str(user.id), role=user.role.value)["token"]
    return {"Authorization": f"Bearer {token}"}


def _token(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex}" + ("x" * 8)


def test_register_requires_auth(client: TestClient) -> None:
    res = client.post("/push/tokens", json={"token": _token("anon"), "platform": "android"})
    assert res.status_code == 401


def test_unregister_requires_auth(client: TestClient) -> None:
    res = client.post("/push/tokens/unregister", json={"token": _token("anon")})
    assert res.status_code == 401


def test_first_token_then_same_token_updates_seen(client: TestClient, db: Session) -> None:
    user = _user(db)
    token = _token("same")
    first = client.post(
        "/push/tokens",
        json={"token": token, "platform": "android"},
        headers=_auth(user),
    )
    assert first.status_code == 200
    assert first.json()["active"] is True
    assert "token" not in first.json()
    second = client.post(
        "/push/tokens",
        json={"token": token, "platform": "android"},
        headers=_auth(user),
    )
    assert second.status_code == 200
    assert second.json()["id"] == first.json()["id"]
    rows = db.execute(select(DevicePushToken).where(DevicePushToken.user_id == user.id)).scalars().all()
    assert len(rows) == 1


def test_two_devices_for_one_user(client: TestClient, db: Session) -> None:
    user = _user(db)
    a = client.post(
        "/push/tokens",
        json={"token": _token("dev-a"), "platform": "android"},
        headers=_auth(user),
    )
    b = client.post(
        "/push/tokens",
        json={"token": _token("dev-b"), "platform": "android"},
        headers=_auth(user),
    )
    assert a.status_code == 200 and b.status_code == 200
    assert a.json()["id"] != b.json()["id"]


def test_same_token_moves_to_the_new_user(client: TestClient, db: Session) -> None:
    first = _user(db)
    second = _user(db)
    token = _token("move")
    created = client.post(
        "/push/tokens",
        json={"token": token, "platform": "android"},
        headers=_auth(first),
    )
    moved = client.post(
        "/push/tokens",
        json={"token": token, "platform": "android"},
        headers=_auth(second),
    )
    assert moved.status_code == 200
    assert moved.json()["id"] == created.json()["id"]
    db.expire_all()
    row = db.execute(select(DevicePushToken).where(DevicePushToken.token == token)).scalar_one()
    assert row.user_id == second.id
    assert row.active is True


def test_logout_deactivates_without_deleting(client: TestClient, db: Session) -> None:
    user = _user(db)
    token = _token("bye")
    client.post(
        "/push/tokens",
        json={"token": token, "platform": "android"},
        headers=_auth(user),
    )
    gone = client.post(
        "/push/tokens/unregister",
        json={"token": token},
        headers=_auth(user),
    )
    assert gone.status_code == 200
    assert gone.json()["active"] is False
    db.expire_all()
    row = db.execute(select(DevicePushToken).where(DevicePushToken.token == token)).scalar_one()
    assert row.active is False


def test_blocked_user_is_not_eligible(db: Session) -> None:
    user = _user(db)
    token = _token("block")
    db.add(
        DevicePushToken(
            user_id=user.id,
            token=token,
            platform="android",
            active=True,
        )
    )
    db.commit()
    user.status = UserStatus.blocked
    db.commit()
    assert active_tokens_for_user(db, user) == []
    db.expire_all()
    row = db.execute(select(DevicePushToken).where(DevicePushToken.token == token)).scalar_one()
    assert row.active is False


def test_invalid_fcm_token_is_deactivated(db: Session) -> None:
    user = _user(db)
    token = _token("stale")
    db.add(DevicePushToken(user_id=user.id, token=token, platform="android", active=True))
    db.commit()

    class _Sender:
        def send(self, *, token: str, title: str, body: str, data: dict[str, str]) -> FcmSendResult:
            return FcmSendResult(ok=False, invalid_token=True)

    results = deliver_user_push(db, user, title="VAMULÁ", body="ok", data={"trip_id": "abc"}, sender=_Sender())
    assert results[0].invalid_token is True
    db.expire_all()
    row = db.execute(select(DevicePushToken).where(DevicePushToken.token == token)).scalar_one()
    assert row.active is False


def test_deleting_user_removes_the_token(db: Session) -> None:
    user = _user(db)
    token = _token("gone")
    db.add(DevicePushToken(user_id=user.id, token=token, platform="android", active=True))
    db.commit()
    db.delete(user)
    db.commit()
    left = db.execute(select(DevicePushToken).where(DevicePushToken.token == token)).scalar_one_or_none()
    assert left is None


def test_token_unique_constraint(db: Session) -> None:
    user = _user(db)
    other = _user(db)
    token = _token("uniq")
    db.add(DevicePushToken(user_id=user.id, token=token, platform="android", active=True))
    db.commit()
    db.add(DevicePushToken(user_id=other.id, token=token, platform="android", active=True))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_fcm_error_marks_unregistered_and_strips_pii() -> None:
    outcome = outcome_from_fcm_response(
        404,
        {"error": {"status": "NOT_FOUND", "details": [{"errorCode": "UNREGISTERED"}]}},
    )
    assert outcome.invalid_token is True
    clean = sanitize_data(
        {
            "trip_id": "abc",
            "origin_lat": "1",
            "price": "4.50",
            "passenger_name": "x",
        }
    )
    assert clean == {"trip_id": "abc"}
