"""Unit tests — PORTAGENS V1 F0 HERE toll client (mocked HTTP, no live calls)."""

from __future__ import annotations

from decimal import Decimal

import httpx
import pytest

from app.core.config import settings
from app.services.tolls.here import (
    ERR_AUTH,
    ERR_CURRENCY,
    ERR_INVALID_JSON,
    ERR_MISSING_API_KEY,
    ERR_RATE_LIMITED,
    ERR_HTTP_5XX,
    ERR_TIMEOUT,
    HERE_ROUTES_URL,
    estimate_tolls,
    parse_here_tolls_payload,
)


ORIGIN = (38.6910, -9.3110)
DEST = (38.7742, -9.1342)


def _enable(monkeypatch: pytest.MonkeyPatch, key: str | None = "test-secret-key-xyz") -> None:
    monkeypatch.setattr(settings, "ENABLE_HERE_TOLLS", True, raising=False)
    monkeypatch.setattr(settings, "HERE_API_KEY", key, raising=False)


def _brisa_payload(amount: float = 0.40) -> dict:
    return {
        "routes": [
            {
                "id": "route-1",
                "sections": [
                    {
                        "summary": {
                            "length": 24600,
                            "duration": 2640,
                            "tolls": {
                                "total": {
                                    "type": "value",
                                    "currency": "EUR",
                                    "value": amount,
                                }
                            },
                        },
                        "tollSystems": [{"name": "BRISA"}],
                        "tolls": [
                            {
                                "tollSystem": "BRISA",
                                "fares": [
                                    {
                                        "id": "fare-brisa-1",
                                        "name": "BRISA fare",
                                        "price": {
                                            "type": "value",
                                            "currency": "EUR",
                                            "value": amount,
                                        },
                                        "paymentMethods": ["transponder"],
                                    }
                                ],
                            }
                        ],
                    }
                ],
            }
        ]
    }


def _lusoponte_payload(amount: float = 2.25) -> dict:
    return {
        "routes": [
            {
                "id": "route-lp",
                "sections": [
                    {
                        "summary": {
                            "length": 5000,
                            "duration": 600,
                            "tolls": {
                                "total": {
                                    "type": "value",
                                    "currency": "EUR",
                                    "value": amount,
                                }
                            },
                        },
                        "tollSystems": [{"name": "LUSOPONTE"}],
                        "tolls": [
                            {
                                "tollSystem": "LUSOPONTE",
                                "fares": [
                                    {
                                        "id": "fare-lp-1",
                                        "name": "Ponte 25 de Abril",
                                        "price": {
                                            "type": "value",
                                            "currency": "EUR",
                                            "value": amount,
                                        },
                                        "paymentMethods": ["cash"],
                                    }
                                ],
                            }
                        ],
                    }
                ],
            }
        ]
    }


def _no_toll_payload() -> dict:
    return {
        "routes": [
            {
                "id": "route-free",
                "sections": [
                    {
                        "summary": {"length": 1000, "duration": 120},
                    }
                ],
            }
        ]
    }


def _client_for(handler) -> httpx.Client:
    transport = httpx.MockTransport(handler)
    return httpx.Client(transport=transport, timeout=httpx.Timeout(8.0, connect=3.0))


def test_flag_off_zero_requests(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENABLE_HERE_TOLLS", False, raising=False)
    monkeypatch.setattr(settings, "HERE_API_KEY", "should-not-be-used", raising=False)
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        return httpx.Response(200, json=_brisa_payload())

    with _client_for(handler) as client:
        result = estimate_tolls(*ORIGIN, *DEST, client=client)

    assert calls["n"] == 0
    assert result.status == "flag_off"
    assert result.amount == Decimal("0.00")
    assert result.source == "here"
    assert result.error_code is None


def test_toll_route_brisa(monkeypatch: pytest.MonkeyPatch) -> None:
    _enable(monkeypatch)

    def handler(request: httpx.Request) -> httpx.Response:
        assert str(request.url).startswith(HERE_ROUTES_URL)
        assert "transportMode=car" in str(request.url)
        assert "currency=EUR" in str(request.url)
        return httpx.Response(200, json=_brisa_payload(0.40))

    with _client_for(handler) as client:
        result = estimate_tolls(*ORIGIN, *DEST, client=client)

    assert result.status == "ok"
    assert result.amount == Decimal("0.40")
    assert result.currency == "EUR"
    assert "BRISA" in result.systems
    assert result.http_status == 200
    assert result.error_code is None


def test_toll_route_lusoponte(monkeypatch: pytest.MonkeyPatch) -> None:
    _enable(monkeypatch)

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=_lusoponte_payload(2.25))

    with _client_for(handler) as client:
        result = estimate_tolls(38.6780, -9.1600, 38.7030, -9.1750, client=client)

    assert result.status == "ok"
    assert result.amount == Decimal("2.25")
    assert "LUSOPONTE" in result.systems


def test_no_toll_route(monkeypatch: pytest.MonkeyPatch) -> None:
    _enable(monkeypatch)

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=_no_toll_payload())

    with _client_for(handler) as client:
        result = estimate_tolls(*ORIGIN, *DEST, client=client)

    assert result.status == "no_tolls"
    assert result.amount == Decimal("0.00")
    assert result.error_code is None


def test_timeout(monkeypatch: pytest.MonkeyPatch) -> None:
    _enable(monkeypatch)

    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("read timed out", request=request)

    with _client_for(handler) as client:
        result = estimate_tolls(*ORIGIN, *DEST, client=client)

    assert result.status == "error"
    assert result.error_code == ERR_TIMEOUT
    assert result.amount == Decimal("0.00")


def test_http_401(monkeypatch: pytest.MonkeyPatch) -> None:
    _enable(monkeypatch)

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"error": "Unauthorized"})

    with _client_for(handler) as client:
        result = estimate_tolls(*ORIGIN, *DEST, client=client)

    assert result.status == "error"
    assert result.error_code == ERR_AUTH
    assert result.http_status == 401


def test_http_429(monkeypatch: pytest.MonkeyPatch) -> None:
    _enable(monkeypatch)

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(429, json={"error": "rate"})

    with _client_for(handler) as client:
        result = estimate_tolls(*ORIGIN, *DEST, client=client)

    assert result.status == "error"
    assert result.error_code == ERR_RATE_LIMITED
    assert result.http_status == 429


def test_http_500_retries_once(monkeypatch: pytest.MonkeyPatch) -> None:
    _enable(monkeypatch)
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        return httpx.Response(500, json={"error": "boom"})

    with _client_for(handler) as client:
        result = estimate_tolls(*ORIGIN, *DEST, client=client)

    assert calls["n"] == 2  # initial + 1 retry
    assert result.status == "error"
    assert result.error_code == ERR_HTTP_5XX
    assert result.http_status == 500


def test_http_400_no_retry(monkeypatch: pytest.MonkeyPatch) -> None:
    _enable(monkeypatch)
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        return httpx.Response(400, json={"error": "bad"})

    with _client_for(handler) as client:
        result = estimate_tolls(*ORIGIN, *DEST, client=client)

    assert calls["n"] == 1
    assert result.status == "error"
    assert result.http_status == 400


def test_malformed_json(monkeypatch: pytest.MonkeyPatch) -> None:
    _enable(monkeypatch)

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, content=b"not-json{{{", headers={"content-type": "application/json"})

    with _client_for(handler) as client:
        result = estimate_tolls(*ORIGIN, *DEST, client=client)

    assert result.status == "error"
    assert result.error_code == ERR_INVALID_JSON


def test_missing_toll_fields_routes(monkeypatch: pytest.MonkeyPatch) -> None:
    _enable(monkeypatch)

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"routes": []})

    with _client_for(handler) as client:
        result = estimate_tolls(*ORIGIN, *DEST, client=client)

    assert result.status == "error"
    assert result.error_code == ERR_INVALID_JSON


def test_currency_not_eur(monkeypatch: pytest.MonkeyPatch) -> None:
    _enable(monkeypatch)
    payload = _brisa_payload(1.0)
    payload["routes"][0]["sections"][0]["summary"]["tolls"]["total"]["currency"] = "USD"

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=payload)

    with _client_for(handler) as client:
        result = estimate_tolls(*ORIGIN, *DEST, client=client)

    assert result.status == "error"
    assert result.error_code == ERR_CURRENCY
    assert result.currency == "USD"


def test_api_key_missing_flag_on(monkeypatch: pytest.MonkeyPatch) -> None:
    _enable(monkeypatch, key=None)
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        return httpx.Response(200, json=_brisa_payload())

    with _client_for(handler) as client:
        result = estimate_tolls(*ORIGIN, *DEST, client=client)

    assert calls["n"] == 0
    assert result.status == "error"
    assert result.error_code == ERR_MISSING_API_KEY


def test_api_key_not_in_errors_or_audit(monkeypatch: pytest.MonkeyPatch) -> None:
    secret = "super-secret-api-key-do-not-leak"
    _enable(monkeypatch, key=secret)

    def handler(request: httpx.Request) -> httpx.Response:
        # Key is in URL params for HERE — response path must not leak into result strings.
        assert secret in str(request.url)
        return httpx.Response(401, text=f"bad key {secret}")

    with _client_for(handler) as client:
        result = estimate_tolls(*ORIGIN, *DEST, client=client)

    audit = result.to_audit_dict()
    blob = str(result) + str(audit) + str(result.error_code)
    assert secret not in blob
    assert result.error_code == ERR_AUTH


def test_parse_here_tolls_payload_brisa() -> None:
    parsed = parse_here_tolls_payload(_brisa_payload(0.40))
    assert parsed["toll_total"] == 0.40
    assert parsed["toll_currency"] == "EUR"
    assert "BRISA" in parsed["systems"]
    assert parsed["has_routes"] is True
