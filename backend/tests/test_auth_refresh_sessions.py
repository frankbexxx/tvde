"""Sessões renováveis (G2-AUTH-1). O login real ainda não emite refresh."""

from __future__ import annotations

import base64
import logging
import secrets
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import refresh_sessions as refresh_module
from app.auth.passwords import hash_password
from app.auth.refresh_crypto import InsecureRefreshKey, require_refresh_key
from app.auth.refresh_sessions import (
    begin_refresh,
    digest,
    issue_session,
    policy_for,
    purge_expired_successor_ciphertexts,
)
from app.core.config import settings
from app.services.cleanup import run_cleanup
from app.db.models.auth_session import AuthRefreshToken, AuthSessionFamily
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal
from app.models.enums import Role, UserStatus
from tests.support.unique_phone import unique_test_phone

TEST_REFRESH_KEY = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode("ascii")
PASSWORD = "OldPass12"
NEW_PASSWORD = "NovaPass12"


@pytest.fixture(autouse=True)
def _refresh_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "REFRESH_SUCCESSOR_KEY", TEST_REFRESH_KEY, raising=False)


def _user(db: Session, role: Role = Role.driver, *, password: str | None = None) -> User:
    user = User(
        role=role,
        name=role.value,
        phone=unique_test_phone(),
        status=UserStatus.active,
        password_hash=hash_password(password) if password else None,
        is_test_account=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _open(
    db: Session,
    role: Role = Role.driver,
    *,
    client_type: str = "android",
    password: str | None = None,
) -> tuple[User, str, uuid.UUID]:
    user = _user(db, role, password=password)
    issued = issue_session(db, user, client_type=client_type)  # type: ignore[arg-type]
    db.commit()
    return user, issued.refresh_token, issued.family_id


def _headers(client_type: str = "android") -> dict[str, str]:
    return {
        "X-Auth-Contract": "refresh-v1",
        "X-Auth-Client": client_type,
    }


def _refresh(
    client: TestClient,
    secret: str,
    key: str,
    *,
    client_type: str = "android",
):
    body: dict[str, str] = {"idempotency_key": key}
    if client_type == "android":
        body["refresh_token"] = secret
        return client.post("/auth/refresh", json=body, headers=_headers(client_type))
    client.cookies.set("vamula_refresh", secret)
    try:
        return client.post("/auth/refresh", json=body, headers=_headers(client_type))
    finally:
        client.cookies.clear()


def _family(db: Session, family_id: uuid.UUID) -> AuthSessionFamily:
    db.expire_all()
    family = db.get(AuthSessionFamily, family_id)
    assert family is not None
    return family


def _tokens(db: Session, family_id: uuid.UUID) -> list[AuthRefreshToken]:
    db.expire_all()
    return list(
        db.execute(
            select(AuthRefreshToken)
            .where(AuthRefreshToken.family_id == family_id)
            .order_by(AuthRefreshToken.generation)
        ).scalars()
    )


def test_refresh_rotates_once_and_replay_returns_the_same_successor(
    client: TestClient, db: Session
) -> None:
    _user_ignored, secret, family_id = _open(db)
    key = str(uuid.uuid4())
    first = _refresh(client, secret, key)
    second = _refresh(client, secret, key)
    assert first.status_code == 200, first.text
    assert second.status_code == 200, second.text
    assert first.json()["refresh_token"] == second.json()["refresh_token"]
    assert first.json()["access_token"] == second.json()["access_token"]
    assert first.json()["refresh_token"] != secret
    rows = _tokens(db, family_id)
    assert [row.status for row in rows] == ["rotated", "active"]
    assert rows[0].token_hash == digest(secret)
    assert secret not in (rows[0].token_hash or "")
    assert rows[0].idempotency_key_hash == digest(key)
    assert key not in (rows[0].idempotency_key_hash or "")
    blob = bytes(rows[0].successor_ciphertext or b"")
    assert blob
    assert secret.encode() not in blob
    assert key.encode() not in blob
    assert rows[1].successor_ciphertext is None
    retained = rows[0].successor_retain_until - rows[0].rotated_at
    assert retained.total_seconds() == pytest.approx(30, abs=1)
    third = _refresh(client, first.json()["refresh_token"], str(uuid.uuid4()))
    assert third.status_code == 200, third.text
    assert len(_tokens(db, family_id)) == 3


def test_concurrent_same_key_returns_one_successor(
    client: TestClient, db: Session
) -> None:
    _user_ignored, secret, family_id = _open(db)
    key = str(uuid.uuid4())

    def call() -> tuple[int, dict]:
        response = _refresh(client, secret, key)
        return response.status_code, response.json()

    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(lambda _i: call(), (1, 2)))

    assert [code for code, _body in outcomes] == [200, 200]
    bodies = [body for _code, body in outcomes]
    assert bodies[0]["refresh_token"] == bodies[1]["refresh_token"]
    assert bodies[0]["access_token"] == bodies[1]["access_token"]
    rows = _tokens(db, family_id)
    assert len(rows) == 2
    assert sum(row.status == "active" for row in rows) == 1


def test_different_key_after_use_revokes_the_family(
    client: TestClient, db: Session
) -> None:
    _user_ignored, secret, family_id = _open(db)
    first = _refresh(client, secret, str(uuid.uuid4()))
    assert first.status_code == 200, first.text
    reused = _refresh(client, secret, str(uuid.uuid4()))
    assert reused.status_code == 401
    assert reused.json()["detail"] == "invalid_grant"
    family = _family(db, family_id)
    assert family.revoked_at is not None
    assert family.revoke_reason == "reuse"
    successor = _refresh(client, first.json()["refresh_token"], str(uuid.uuid4()))
    assert successor.status_code == 401
    assert successor.json()["detail"] == "invalid_grant"


def test_concurrent_different_keys_do_not_leave_two_successors(
    client: TestClient, db: Session
) -> None:
    _user_ignored, secret, family_id = _open(db)

    def call(key: str) -> int:
        return _refresh(client, secret, key).status_code

    keys = (str(uuid.uuid4()), str(uuid.uuid4()))
    with ThreadPoolExecutor(max_workers=2) as pool:
        statuses = sorted(pool.map(call, keys))

    assert statuses == [200, 401]
    family = _family(db, family_id)
    assert family.revoke_reason == "reuse"
    assert sum(row.status == "active" for row in _tokens(db, family_id)) == 0


def test_replay_after_grace_revokes_the_family(
    client: TestClient, db: Session
) -> None:
    _user_ignored, secret, family_id = _open(db)
    key = str(uuid.uuid4())
    assert _refresh(client, secret, key).status_code == 200
    rotated = _tokens(db, family_id)[0]
    rotated.successor_retain_until = datetime.now(timezone.utc) - timedelta(seconds=1)
    db.commit()
    late = _refresh(client, secret, key)
    assert late.status_code == 401
    assert late.json()["detail"] == "invalid_grant"
    family = _family(db, family_id)
    assert family.revoke_reason == "reuse"
    assert _tokens(db, family_id)[0].successor_ciphertext is None


def test_unknown_token_does_not_revoke_another_family(
    client: TestClient, db: Session
) -> None:
    _user_ignored, secret, family_id = _open(db)
    missing = _refresh(client, secrets.token_urlsafe(32), str(uuid.uuid4()))
    assert missing.status_code == 401
    assert missing.json()["detail"] == "invalid_grant"
    assert _family(db, family_id).revoked_at is None
    assert _refresh(client, secret, str(uuid.uuid4())).status_code == 200


def test_logout_revokes_only_the_authorized_family(
    client: TestClient, db: Session
) -> None:
    user, secret, family_id = _open(db)
    other = issue_session(db, user, client_type="android")
    stranger, stranger_secret, stranger_family = _open(db)
    db.commit()
    trips_before = db.execute(select(func.count()).select_from(Trip)).scalar()
    denied = client.post(
        "/auth/logout",
        headers={**_headers(), "Authorization": "Bearer not-a-refresh"},
    )
    assert denied.status_code == 400
    assert _family(db, family_id).revoked_at is None
    logged_out = client.post(
        "/auth/logout",
        headers=_headers(),
        json={"refresh_token": secret},
    )
    assert logged_out.status_code == 204, logged_out.text
    assert _family(db, family_id).revoke_reason == "logout"
    assert _family(db, other.family_id).revoked_at is None
    assert _family(db, stranger_family).revoked_at is None
    assert _refresh(client, other.refresh_token, str(uuid.uuid4())).status_code == 200
    assert _refresh(client, stranger_secret, str(uuid.uuid4())).status_code == 200
    assert db.execute(select(func.count()).select_from(Trip)).scalar() == trips_before
    again = client.post(
        "/auth/logout",
        headers=_headers(),
        json={"refresh_token": secret},
    )
    assert again.status_code == 204
    assert stranger.id


def test_password_change_and_recovery_revoke_every_family_of_the_account(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", "test", raising=False)
    owner, secret, family_id = _open(db, password=PASSWORD)
    second = issue_session(db, owner, client_type="android")
    bystander, bystander_secret, bystander_family = _open(db, password=PASSWORD)
    db.commit()
    from app.auth.security import create_access_token

    access = create_access_token(
        subject=str(owner.id),
        role=owner.role.value,
        token_version=int(owner.token_version or 0),
    )
    changed = client.post(
        "/auth/me/password",
        json={"current_password": PASSWORD, "new_password": NEW_PASSWORD},
        headers={"Authorization": f"Bearer {access['token']}"},
    )
    assert changed.status_code == 200, changed.text
    db.expire_all()
    assert int(db.get(User, owner.id).token_version) == 1
    assert _family(db, family_id).revoke_reason == "password_change"
    assert _family(db, second.family_id).revoke_reason == "password_change"
    assert _family(db, bystander_family).revoked_at is None
    assert _refresh(client, secret, str(uuid.uuid4())).status_code == 401

    from app.api.routers import auth as auth_module

    monkeypatch.setattr(auth_module, "generate_otp_code", lambda: "654321")
    forgot = client.post("/auth/password/forgot", json={"phone": bystander.phone})
    assert forgot.status_code == 200, forgot.text
    verified = client.post(
        "/auth/password/forgot/verify",
        json={"phone": bystander.phone, "code": "654321"},
    )
    assert verified.status_code == 200, verified.text
    done = client.post(
        "/auth/password/forgot/complete",
        json={
            "reset_token": verified.json()["reset_token"],
            "new_password": NEW_PASSWORD,
            "confirm_password": NEW_PASSWORD,
        },
    )
    assert done.status_code == 200, done.text
    assert "access_token" not in done.json()
    assert _family(db, bystander_family).revoke_reason == "password_recovery"
    assert _refresh(client, bystander_secret, str(uuid.uuid4())).status_code == 401


def test_idle_and_absolute_deadlines_are_enforced(
    client: TestClient, db: Session
) -> None:
    expected = {
        Role.driver: (timedelta(hours=4), timedelta(hours=18)),
        Role.passenger: (timedelta(hours=24), timedelta(days=14)),
        Role.partner: (timedelta(hours=12), timedelta(days=7)),
        Role.admin: (timedelta(hours=8), timedelta(hours=12)),
        Role.super_admin: (timedelta(hours=8), timedelta(hours=12)),
    }
    for role, (idle, absolute) in expected.items():
        assert policy_for(role) == (idle, absolute)
        _user_ignored, _secret, family_id = _open(db, role)
        family = _family(db, family_id)
        token = _tokens(db, family_id)[0]
        assert token.idle_expires_at - family.created_at == idle
        assert family.absolute_expires_at - family.created_at == absolute

    _user_ignored, secret, family_id = _open(db, Role.driver)
    token = _tokens(db, family_id)[0]
    token.idle_expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    db.commit()
    idle = _refresh(client, secret, str(uuid.uuid4()))
    assert idle.status_code == 401
    assert idle.json()["detail"] == "session_expired"
    assert _family(db, family_id).revoke_reason == "expired"

    _user_ignored, secret, family_id = _open(db, Role.admin)
    family = _family(db, family_id)
    family.absolute_expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    db.commit()
    absolute = _refresh(client, secret, str(uuid.uuid4()))
    assert absolute.status_code == 401
    assert absolute.json()["detail"] == "session_expired"


def test_uncommitted_rotation_and_lock_timeout_do_not_revoke(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    user, secret, family_id = _open(db)
    key = str(uuid.uuid4())
    outcome = begin_refresh(
        db,
        refresh_token=secret,
        idempotency_key=key,
        client_type="android",
    )
    assert outcome.kind == "ok"
    db.rollback()
    assert _family(db, family_id).revoked_at is None
    assert len(_tokens(db, family_id)) == 1

    monkeypatch.setattr(refresh_module, "LOCK_TIMEOUT", "300ms")
    holder = SessionLocal()
    try:
        holder.execute(
            select(AuthSessionFamily)
            .where(AuthSessionFamily.id == family_id)
            .with_for_update()
        ).scalar_one()
        blocked = _refresh(client, secret, key)
        assert blocked.status_code == 503
        assert blocked.json()["detail"] == "refresh_unavailable"
        assert secret not in blocked.text
        assert key not in blocked.text
    finally:
        holder.rollback()
        holder.close()

    assert _family(db, family_id).revoked_at is None
    recovered = _refresh(client, secret, key)
    assert recovered.status_code == 200, recovered.text
    assert len(_tokens(db, family_id)) == 2
    assert user.id


def test_legacy_login_stays_unchanged_without_a_refresh_family(
    client: TestClient, db: Session
) -> None:
    user = _user(db, Role.passenger, password=PASSWORD)
    before = db.execute(select(func.count()).select_from(AuthSessionFamily)).scalar()
    login = client.post(
        "/auth/login",
        json={"phone": user.phone, "password": PASSWORD},
        headers=_headers("web"),
    )
    assert login.status_code == 200, login.text
    assert set(login.json()) == {
        "access_token",
        "token_type",
        "user_id",
        "role",
        "expires_at",
        "display_name",
        "phone",
    }
    assert "set-cookie" not in {name.lower() for name in login.headers}
    after = db.execute(select(func.count()).select_from(AuthSessionFamily)).scalar()
    assert after == before
    payload = jwt.decode(
        login.json()["access_token"],
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
    )
    assert payload["exp"] - payload["iat"] == settings.JWT_ACCESS_TOKEN_MINUTES * 60
    assert settings.JWT_ACCESS_TOKEN_MINUTES == 60
    me = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {login.json()['access_token']}"},
    )
    assert me.status_code == 200
    refused = client.post("/auth/refresh", json={"idempotency_key": str(uuid.uuid4())})
    assert refused.status_code == 400
    assert refused.json()["detail"] == "auth_contract_required"


def test_web_cookie_and_android_body_are_separate(
    client: TestClient, db: Session
) -> None:
    _user_ignored, android_secret, _android_family = _open(db, client_type="android")
    android = _refresh(client, android_secret, str(uuid.uuid4()), client_type="android")
    assert android.status_code == 200, android.text
    assert "refresh_token" in android.json()
    assert "set-cookie" not in {name.lower() for name in android.headers}

    _user_ignored, web_secret, _web_family = _open(db, client_type="web")
    web = _refresh(client, web_secret, str(uuid.uuid4()), client_type="web")
    assert web.status_code == 200, web.text
    assert "refresh_token" not in web.json()
    cookie = web.headers["set-cookie"]
    assert "HttpOnly" in cookie
    assert "Secure" in cookie
    assert "SameSite=lax" in cookie
    assert "Path=/auth" in cookie
    assert web_secret not in web.text

    mismatch = _refresh(client, android_secret, str(uuid.uuid4()), client_type="web")
    assert mismatch.status_code == 401
    assert _family(db, _android_family).revoked_at is None


def test_weak_key_is_refused_and_purge_clears_expired_ciphertext(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _user_ignored, secret, family_id = _open(db)
    monkeypatch.setattr(settings, "REFRESH_SUCCESSOR_KEY", None, raising=False)
    with pytest.raises(InsecureRefreshKey):
        require_refresh_key()
    refused = _refresh(client, secret, str(uuid.uuid4()))
    assert refused.status_code == 503
    assert refused.json()["detail"] == "refresh_unavailable"
    assert _family(db, family_id).revoked_at is None
    assert len(_tokens(db, family_id)) == 1

    monkeypatch.setattr(settings, "REFRESH_SUCCESSOR_KEY", "changeme", raising=False)
    assert _refresh(client, secret, str(uuid.uuid4())).status_code == 503
    monkeypatch.setattr(
        settings,
        "REFRESH_SUCCESSOR_KEY",
        base64.urlsafe_b64encode(b"\x00" * 32).decode("ascii"),
        raising=False,
    )
    assert _refresh(client, secret, str(uuid.uuid4())).status_code == 503
    monkeypatch.setattr(
        settings, "REFRESH_SUCCESSOR_KEY", settings.JWT_SECRET_KEY, raising=False
    )
    assert _refresh(client, secret, str(uuid.uuid4())).status_code == 503
    assert _family(db, family_id).revoked_at is None

    monkeypatch.setattr(settings, "REFRESH_SUCCESSOR_KEY", TEST_REFRESH_KEY, raising=False)
    key = str(uuid.uuid4())
    assert _refresh(client, secret, key).status_code == 200
    rotated = _tokens(db, family_id)[0]
    rotated.successor_retain_until = datetime.now(timezone.utc) - timedelta(seconds=1)
    db.commit()
    assert purge_expired_successor_ciphertexts(db) == 1
    db.commit()
    assert _tokens(db, family_id)[0].successor_ciphertext is None


def test_refresh_logs_do_not_include_secrets(
    client: TestClient, db: Session, caplog: pytest.LogCaptureFixture
) -> None:
    _user_ignored, secret, _family_id = _open(db)
    key = str(uuid.uuid4())
    with caplog.at_level(logging.DEBUG):
        response = _refresh(client, secret, key)
    assert response.status_code == 200, response.text
    assert secret not in caplog.text
    assert key not in caplog.text
    assert response.json()["refresh_token"] not in caplog.text


def _without_refresh_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "REFRESH_SUCCESSOR_KEY", None, raising=False)


def _rotated_pair(
    db: Session, *, retain_until: datetime
) -> tuple[uuid.UUID, uuid.UUID, uuid.UUID]:
    _user_ignored, _secret, family_id = _open(db)
    current = _tokens(db, family_id)[0]
    now = datetime.now(timezone.utc)
    current.status = "rotated"
    current.rotated_at = now
    current.successor_ciphertext = b"rotated-cipher"
    current.successor_retain_until = retain_until
    db.flush()
    successor_id = uuid.uuid4()
    db.add(
        AuthRefreshToken(
            id=successor_id,
            family_id=family_id,
            token_hash=digest(secrets.token_urlsafe(32)),
            generation=2,
            status="active",
            created_at=now,
            idle_expires_at=now + timedelta(hours=4),
        )
    )
    db.commit()
    return family_id, current.id, successor_id


def test_legacy_login_and_password_flows_work_without_refresh_key(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _without_refresh_key(monkeypatch)
    monkeypatch.setattr(settings, "ENVIRONMENT", "test", raising=False)
    user = _user(db, Role.passenger, password=PASSWORD)
    before = db.execute(select(func.count()).select_from(AuthSessionFamily)).scalar()
    login = client.post(
        "/auth/login",
        json={"phone": user.phone, "password": PASSWORD},
        headers=_headers("web"),
    )
    assert login.status_code == 200, login.text
    assert "refresh_token" not in login.json()
    assert "set-cookie" not in {name.lower() for name in login.headers}
    assert (
        db.execute(select(func.count()).select_from(AuthSessionFamily)).scalar()
        == before
    )
    me = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {login.json()['access_token']}"},
    )
    assert me.status_code == 200

    from app.auth.security import create_access_token

    owner, _secret, family_id = _open(db, Role.driver, password=PASSWORD)
    version_before = int(owner.token_version or 0)
    access = create_access_token(
        subject=str(owner.id),
        role=owner.role.value,
        token_version=version_before,
    )
    changed = client.post(
        "/auth/me/password",
        json={"current_password": PASSWORD, "new_password": NEW_PASSWORD},
        headers={"Authorization": f"Bearer {access['token']}"},
    )
    assert changed.status_code == 200, changed.text
    assert changed.json() == {"status": "ok"}
    db.expire_all()
    stored = db.get(User, owner.id)
    assert stored is not None
    assert int(stored.token_version) == version_before + 1
    assert _family(db, family_id).revoke_reason == "password_change"
    relogin = client.post(
        "/auth/login",
        json={"phone": owner.phone, "password": NEW_PASSWORD},
    )
    assert relogin.status_code == 200, relogin.text
    assert "refresh_token" not in relogin.json()

    from app.api.routers import auth as auth_module

    monkeypatch.setattr(auth_module, "generate_otp_code", lambda: "654321")
    passenger = _user(db, Role.passenger, password=PASSWORD)
    version = int(passenger.token_version or 0)
    forgot = client.post("/auth/password/forgot", json={"phone": passenger.phone})
    assert forgot.status_code == 200, forgot.text
    assert forgot.json() == {"status": "accepted"}
    verified = client.post(
        "/auth/password/forgot/verify",
        json={"phone": passenger.phone, "code": "654321"},
    )
    assert verified.status_code == 200, verified.text
    done = client.post(
        "/auth/password/forgot/complete",
        json={
            "reset_token": verified.json()["reset_token"],
            "new_password": NEW_PASSWORD,
            "confirm_password": NEW_PASSWORD,
        },
    )
    assert done.status_code == 200, done.text
    assert done.json() == {"status": "accepted"}
    assert "access_token" not in done.json()
    db.expire_all()
    recovered = db.get(User, passenger.id)
    assert recovered is not None
    assert recovered.role == Role.passenger
    assert int(recovered.token_version) == version + 1
    recovered_login = client.post(
        "/auth/login",
        json={"phone": passenger.phone, "password": NEW_PASSWORD},
    )
    assert recovered_login.status_code == 200, recovered_login.text
    assert recovered_login.json()["role"] == Role.passenger.value


def test_refresh_without_key_returns_503_and_keeps_the_session(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _user_ignored, secret, family_id = _open(db)
    _without_refresh_key(monkeypatch)
    refused = _refresh(client, secret, str(uuid.uuid4()))
    assert refused.status_code == 503
    assert refused.json()["detail"] == "refresh_unavailable"
    assert secret not in refused.text
    family = _family(db, family_id)
    assert family.revoked_at is None
    tokens = _tokens(db, family_id)
    assert len(tokens) == 1
    assert tokens[0].status == "active"
    assert tokens[0].token_hash == digest(secret)


def test_cron_clears_only_expired_successor_ciphertexts(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _without_refresh_key(monkeypatch)
    now = datetime.now(timezone.utc)
    expired_family, expired_rotated, expired_active = _rotated_pair(
        db, retain_until=now - timedelta(seconds=1)
    )
    fresh_family, fresh_rotated, fresh_active = _rotated_pair(
        db, retain_until=now + timedelta(seconds=30)
    )
    active = db.get(AuthRefreshToken, expired_active)
    assert active is not None
    active.successor_ciphertext = b"active-cipher"
    active.successor_retain_until = now - timedelta(seconds=5)
    db.commit()

    def _snapshot(token_id: uuid.UUID) -> tuple:
        db.expire_all()
        row = db.get(AuthRefreshToken, token_id)
        assert row is not None
        return (
            row.status,
            row.token_hash,
            row.generation,
            bytes(row.successor_ciphertext) if row.successor_ciphertext else None,
        )

    active_before = _snapshot(expired_active)
    fresh_active_before = _snapshot(fresh_active)
    fresh_cipher_before = _snapshot(fresh_rotated)[3]
    assert fresh_cipher_before == b"rotated-cipher"
    assert _family(db, expired_family).revoked_at is None
    assert _family(db, fresh_family).revoked_at is None

    first = run_cleanup(db)
    assert first["refresh_successors_cleared"] >= 1
    assert "audit_events_deleted" in first
    assert _snapshot(expired_rotated)[0] == "rotated"
    assert _snapshot(expired_rotated)[3] is None
    assert _snapshot(fresh_rotated)[0] == "rotated"
    assert _snapshot(fresh_rotated)[3] == b"rotated-cipher"
    assert _snapshot(expired_active) == active_before
    assert _snapshot(fresh_active) == fresh_active_before
    assert _family(db, expired_family).revoked_at is None
    assert _family(db, fresh_family).revoked_at is None
    assert _family(db, expired_family).revoke_reason is None

    second = run_cleanup(db)
    assert _snapshot(expired_rotated)[0] == "rotated"
    assert _snapshot(expired_rotated)[3] is None
    assert _snapshot(fresh_rotated)[0] == "rotated"
    assert _snapshot(fresh_rotated)[3] == b"rotated-cipher"
    assert _snapshot(expired_active) == active_before
    assert _family(db, expired_family).revoked_at is None
    assert _family(db, fresh_family).revoked_at is None

    monkeypatch.setattr(settings, "CRON_SECRET", "auth1b-cron", raising=False)
    cron = client.get("/cron/jobs", headers={"X-Cron-Secret": "auth1b-cron"})
    body = cron.json()
    assert "cleanup" not in body["errors"]
    assert body["cleanup"]["refresh_successors_cleared"] >= 0
    again = client.get("/cron/jobs", headers={"X-Cron-Secret": "auth1b-cron"})
    assert "cleanup" not in again.json()["errors"]
    assert _snapshot(expired_rotated)[0] == "rotated"
    assert _snapshot(expired_rotated)[3] is None
    assert _snapshot(fresh_rotated)[0] == "rotated"
    assert _snapshot(fresh_rotated)[3] == b"rotated-cipher"
    assert _snapshot(expired_active) == active_before
    assert _snapshot(fresh_active) == fresh_active_before
    assert _family(db, expired_family).revoked_at is None
    assert _family(db, fresh_family).revoked_at is None
    assert second["refresh_successors_cleared"] >= 0


def test_refresh_access_token_keeps_the_global_hour(
    client: TestClient, db: Session
) -> None:
    _user_ignored, secret, _family_id = _open(db)
    response = _refresh(client, secret, str(uuid.uuid4()))
    assert response.status_code == 200, response.text
    payload = jwt.decode(
        response.json()["access_token"],
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
    )
    assert payload["exp"] - payload["iat"] == 60 * 60
    assert response.json()["expires_in"] == pytest.approx(3600, abs=2)
