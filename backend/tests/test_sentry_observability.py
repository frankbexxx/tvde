"""S-OPS-04 — request_id tag, 4xx filter, cron capture once, PII scrub."""

from __future__ import annotations

from fastapi import HTTPException

import app.api.routers.cron as cron_router
from app.core.config import settings
from app.middleware.request_id import request_id_ctx
from app.sentry import add_context, capture_handled_exception, filter_sentry_event
from fastapi.testclient import TestClient


def test_filter_attaches_request_id_and_keeps_5xx() -> None:
    token = request_id_ctx.set("rid-500")
    try:
        event = filter_sentry_event({"request": {"url": "https://api.example/trips"}}, {})
    finally:
        request_id_ctx.reset(token)
    assert event is not None
    assert event["tags"]["request_id"] == "rid-500"


def test_filter_drops_4xx_and_health() -> None:
    try:
        raise HTTPException(status_code=400, detail="nope")
    except HTTPException as exc:
        dropped = filter_sentry_event(
            {"request": {"url": "https://api.example/trips"}},
            {"exc_info": (type(exc), exc, exc.__traceback__)},
        )
    assert dropped is None
    assert filter_sentry_event({"request": {"url": "https://api.example/health"}}, {}) is None


def test_filter_strips_auth_body_and_user_pii() -> None:
    event = filter_sentry_event(
        {
            "request": {
                "url": "https://api.example/trips",
                "headers": {"Authorization": "Bearer secret", "Accept": "application/json"},
                "data": {"phone": "+351900000000"},
                "cookies": {"session": "x"},
                "query_string": "token=abc",
            },
            "user": {"email": "a@b.c", "id": "1", "ip_address": "1.2.3.4"},
            "extra": {"body": "secret", "trip_id": "t1"},
        },
        {},
    )
    assert event is not None
    headers = event["request"]["headers"]
    assert "Authorization" not in headers
    assert headers["Accept"] == "application/json"
    assert "data" not in event["request"]
    assert "cookies" not in event["request"]
    assert event["request"]["query_string"] == ""
    assert "email" not in event["user"]
    assert "ip_address" not in event["user"]
    assert event["user"]["id"] == "1"
    assert "body" not in event["extra"]
    assert event["extra"]["trip_id"] == "t1"


def test_add_context_skips_pii_keys(monkeypatch) -> None:
    tags: dict[str, str] = {}

    def _set_tag(key: str, value: str) -> None:
        tags[key] = value

    monkeypatch.setattr("sentry_sdk.set_tag", _set_tag)
    add_context(trip_id="t1", email="a@b.c", phone="+351", jwt="tok", lat="38.7")
    assert tags == {"trip_id": "t1"}


def test_capture_handled_exception_once(monkeypatch) -> None:
    seen: list[BaseException] = []

    class _Scope:
        def __enter__(self):
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def set_tag(self, key: str, value: str) -> None:
            return None

    monkeypatch.setattr("sentry_sdk.new_scope", lambda: _Scope())
    monkeypatch.setattr("sentry_sdk.capture_exception", lambda exc: seen.append(exc))
    boom = RuntimeError("job failed")
    capture_handled_exception(boom, cron_job="cleanup")
    assert seen == [boom]


def test_cron_partial_error_captures_once_and_keeps_http_500(
    client: TestClient, monkeypatch
) -> None:
    monkeypatch.setattr(settings, "CRON_SECRET", "sentry_cron_secret", raising=False)
    captured: list[tuple[str, str]] = []

    def _boom(_db: object) -> None:
        raise RuntimeError("timeouts_boom")

    def _capture(exc: BaseException, *, cron_job: str) -> None:
        captured.append((cron_job, str(exc)))

    monkeypatch.setattr(cron_router, "run_trip_timeouts", _boom)
    monkeypatch.setattr(cron_router, "capture_handled_exception", _capture)

    response = client.get("/cron/jobs", headers={"X-Cron-Secret": "sentry_cron_secret"})
    assert response.status_code == 500
    body = response.json()
    assert body["status"] == "partial_error"
    assert "timeouts_boom" in body["errors"]["trip_timeouts"]
    assert captured == [("trip_timeouts", "timeouts_boom")]
