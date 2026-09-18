"""L-GPS-01: legacy POST /matching/find-driver removed (no fleet GPS leak)."""

from __future__ import annotations

import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user, get_db
from app.db.session import SessionLocal
from app.main import app
from app.models.enums import Role


def _make_db() -> Session:
    return SessionLocal()


def _override(db: Session, user_ctx: UserContext) -> None:
    async def override_get_current_user() -> UserContext:
        return user_ctx

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_db] = override_get_db


def _reset() -> None:
    app.dependency_overrides.clear()


def test_find_driver_removed_for_passenger() -> None:
    db = _make_db()
    _override(db, UserContext(user_id=str(uuid.uuid4()), role=Role.passenger))
    client = TestClient(app)
    try:
        r = client.post("/matching/find-driver", json={"lat": 40.0, "lng": -8.0})
        assert r.status_code == 404
    finally:
        _reset()
        db.close()


def test_find_driver_removed_for_driver() -> None:
    db = _make_db()
    _override(db, UserContext(user_id=str(uuid.uuid4()), role=Role.driver))
    client = TestClient(app)
    try:
        r = client.post("/matching/find-driver", json={"lat": 40.0, "lng": -8.0})
        assert r.status_code == 404
    finally:
        _reset()
        db.close()


def test_find_driver_removed_for_admin() -> None:
    db = _make_db()
    _override(db, UserContext(user_id=str(uuid.uuid4()), role=Role.admin))
    client = TestClient(app)
    try:
        r = client.post("/matching/find-driver", json={"lat": 40.0, "lng": -8.0})
        assert r.status_code == 404
    finally:
        _reset()
        db.close()
