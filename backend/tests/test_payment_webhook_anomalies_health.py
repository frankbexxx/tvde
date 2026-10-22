"""PR2: payment_webhook_anomalies block on GET /admin/system-health."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user
from app.core.config import settings
from app.db.models.payment_anomaly import PaymentAnomaly
from app.db.session import SessionLocal
from app.main import app
from app.models.enums import Role
from app.services.payment_anomalies import (
    ANOMALY_WEBHOOK_PAYMENT_NOT_FOUND,
    ANOMALY_WEBHOOK_SUCCEEDED_AMOUNT_MISMATCH,
    SEVERITY_WARNING,
    get_payment_webhook_anomalies_health_summary,
)
from app.services.system_health import get_system_health
def _db() -> Session:
    return SessionLocal()


def _insert_anomaly(
    db: Session,
    *,
    anomaly_type: str,
    severity: str = SEVERITY_WARNING,
    created_at: datetime | None = None,
    stripe_event_id: str | None = None,
) -> PaymentAnomaly:
    now = created_at or datetime.now(timezone.utc)
    row = PaymentAnomaly(
        id=uuid.uuid4(),
        anomaly_type=anomaly_type,
        severity=severity,
        stripe_event_id=stripe_event_id or f"evt_pr2_{uuid.uuid4().hex}",
        payment_intent_id=f"pi_pr2_{uuid.uuid4().hex[:16]}",
        payload_json={"reason": "test", "client_secret": "must_not_leak"},
        environment="test",
        stripe_mode="mock",
        created_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def admin_auth_override() -> None:
    async def _fake_admin() -> UserContext:
        return UserContext(user_id=str(uuid.uuid4()), role=Role.admin)

    app.dependency_overrides[get_current_user] = _fake_admin
    yield
    app.dependency_overrides.pop(get_current_user, None)


def _window_total(db: Session) -> int:
    return int(get_system_health(db)["payment_webhook_anomalies"]["total_in_window"])


def test_health_summary_aggregates_24h_window(monkeypatch: pytest.MonkeyPatch) -> None:
    db = _db()
    ids: list[uuid.UUID] = []
    try:
        monkeypatch.setattr(settings, "ENABLE_PAYMENT_ANOMALY_PERSIST", True, raising=False)
        before = _window_total(db)
        ids.append(
            _insert_anomaly(db, anomaly_type=ANOMALY_WEBHOOK_PAYMENT_NOT_FOUND).id
        )
        ids.append(
            _insert_anomaly(
                db, anomaly_type=ANOMALY_WEBHOOK_SUCCEEDED_AMOUNT_MISMATCH
            ).id
        )
        old = _insert_anomaly(
            db,
            anomaly_type=ANOMALY_WEBHOOK_PAYMENT_NOT_FOUND,
            created_at=datetime.now(timezone.utc) - timedelta(hours=30),
        )
        ids.append(old.id)

        health = get_system_health(db)
        block = health["payment_webhook_anomalies"]
        assert block["total_in_window"] == before + 2
        assert block["persist_enabled"] is True
        assert block["window_hours"] == 24
        types = {x["anomaly_type"]: x["count"] for x in block["counts_by_type"]}
        assert types.get(ANOMALY_WEBHOOK_PAYMENT_NOT_FOUND, 0) >= 1
        assert types.get(ANOMALY_WEBHOOK_SUCCEEDED_AMOUNT_MISMATCH, 0) >= 1
        assert len(block["recent"]) <= 20
        assert "client_secret" not in str(block["recent"])
        for item in block["recent"]:
            assert "client_secret" not in item.get("payload", {})
    finally:
        for i in ids:
            row = db.get(PaymentAnomaly, i)
            if row:
                db.delete(row)
        db.commit()
        db.close()


def test_health_status_unchanged_with_anomalies_in_window(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = _db()
    row_id: uuid.UUID | None = None
    try:
        monkeypatch.setattr(settings, "ENABLE_PAYMENT_ANOMALY_PERSIST", True, raising=False)
        status_before = get_system_health(db)["status"]
        warnings_before = list(get_system_health(db)["warnings"])
        row = _insert_anomaly(db, anomaly_type=ANOMALY_WEBHOOK_PAYMENT_NOT_FOUND)
        row_id = row.id
        health = get_system_health(db)
        assert health["status"] == status_before
        assert health["warnings"] == warnings_before
        assert health["payment_webhook_anomalies"]["total_in_window"] >= 1
    finally:
        if row_id:
            r = db.get(PaymentAnomaly, row_id)
            if r:
                db.delete(r)
                db.commit()
        db.close()


def test_flag_off_still_shows_historical_rows(monkeypatch: pytest.MonkeyPatch) -> None:
    db = _db()
    row_id: uuid.UUID | None = None
    try:
        row = _insert_anomaly(db, anomaly_type=ANOMALY_WEBHOOK_PAYMENT_NOT_FOUND)
        row_id = row.id
        monkeypatch.setattr(settings, "ENABLE_PAYMENT_ANOMALY_PERSIST", False, raising=False)
        block = get_system_health(db)["payment_webhook_anomalies"]
        assert block["persist_enabled"] is False
        assert block["total_in_window"] >= 1
    finally:
        if row_id:
            r = db.get(PaymentAnomaly, row_id)
            if r:
                db.delete(r)
                db.commit()
        db.close()


@pytest.mark.usefixtures("admin_auth_override")
def test_system_health_api_includes_block(client: TestClient) -> None:
    r = client.get("/admin/system-health")
    assert r.status_code == 200
    body = r.json()
    assert "payment_webhook_anomalies" in body
    wh = body["payment_webhook_anomalies"]
    assert "persist_enabled" in wh
    assert wh.get("data_available") is True
    assert "counts_by_type" in wh
    assert "recent" in wh


class _PgOrig:
    def __init__(self, pgcode: str) -> None:
        self.pgcode = pgcode


def test_summary_table_missing_sets_data_unavailable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = MagicMock()

    def _missing_table(*_args: object, **_kwargs: object) -> None:
        raise ProgrammingError(
            "SELECT",
            {},
            _PgOrig("42P01"),
        )

    db.execute.side_effect = _missing_table
    monkeypatch.setattr(settings, "ENABLE_PAYMENT_ANOMALY_PERSIST", True, raising=False)
    block = get_payment_webhook_anomalies_health_summary(db)
    assert block["data_available"] is False
    assert block["total_in_window"] == 0
    assert block["persist_enabled"] is True
    db.rollback.assert_called_once()


def test_summary_unrelated_programming_error_propagates() -> None:
    db = MagicMock()
    db.execute.side_effect = ProgrammingError("SELECT", {}, _PgOrig("42601"))
    with pytest.raises(ProgrammingError):
        get_payment_webhook_anomalies_health_summary(db)


def test_recent_limit_and_order(monkeypatch: pytest.MonkeyPatch) -> None:
    db = _db()
    ids: list[uuid.UUID] = []
    try:
        monkeypatch.setattr(settings, "ENABLE_PAYMENT_ANOMALY_PERSIST", True, raising=False)
        base = datetime.now(timezone.utc) - timedelta(hours=1)
        before = _window_total(db)
        for i in range(22):
            row = _insert_anomaly(
                db,
                anomaly_type=ANOMALY_WEBHOOK_PAYMENT_NOT_FOUND,
                created_at=base + timedelta(minutes=i),
            )
            ids.append(row.id)
        block = get_system_health(db)["payment_webhook_anomalies"]
        total = block["total_in_window"]
        assert total == before + 22
        assert len(block["recent"]) == min(20, total)
        times = [r["created_at"] for r in block["recent"]]
        assert times == sorted(times, reverse=True)
    finally:
        for i in ids:
            row = db.get(PaymentAnomaly, i)
            if row:
                db.delete(row)
        db.commit()
        db.close()
