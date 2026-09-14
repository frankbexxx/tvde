"""HERE tolls client (PORTAGENS V1 — F0).

Isolated foundation: Settings + HTTP client + parse + unit-testable results.
Not wired to create_trip / complete_trip / payment / FE (F1+).

Spike contract alignment: `scripts/tolls/here_tolls_spike.py` stays independent for
live benchmarking; parsing rules mirror the spike (summary.tolls.total preferred,
else unique fare ids). Do not log URLs or exceptions that contain the API key.
"""

from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Literal

import httpx

from app.core.config import Settings, settings as app_settings

logger = logging.getLogger(__name__)

HERE_ROUTES_URL = "https://router.hereapi.com/v8/routes"
EXPECTED_CURRENCY = "EUR"
CONNECT_TIMEOUT_S = 3.0
READ_TIMEOUT_S = 8.0
MAX_RETRIES = 1  # one retry after initial attempt → 2 attempts total on timeout/5xx

TollStatus = Literal["ok", "no_tolls", "flag_off", "error"]

# Internal error codes (no billing semantics).
ERR_MISSING_API_KEY = "here_missing_api_key"
ERR_TIMEOUT = "here_timeout"
ERR_CONNECTION = "here_connection_error"
ERR_AUTH = "here_auth_error"
ERR_RATE_LIMITED = "here_rate_limited"
ERR_HTTP_4XX = "here_http_4xx"
ERR_HTTP_5XX = "here_http_5xx"
ERR_INVALID_JSON = "here_invalid_response"
ERR_MISSING_FIELDS = "here_invalid_response"
ERR_CURRENCY = "here_currency_mismatch"


@dataclass(frozen=True)
class TollFareInfo:
    name: str | None
    currency: str | None
    value: float | None
    toll_system: str | None = None
    payment_methods: tuple[str, ...] = ()
    fare_id: str | None = None


@dataclass(frozen=True)
class TollEstimateResult:
    amount: Decimal
    currency: str
    source: str
    status: TollStatus
    calculated_at: datetime
    systems: tuple[str, ...] = ()
    fares: tuple[TollFareInfo, ...] = ()
    http_status: int | None = None
    latency_ms: int | None = None
    error_code: str | None = None

    def to_audit_dict(self) -> dict[str, Any]:
        """Safe dict for logs/audit — never includes API key."""
        return {
            "amount": str(self.amount),
            "currency": self.currency,
            "source": self.source,
            "status": self.status,
            "calculated_at": self.calculated_at.isoformat(),
            "systems": list(self.systems),
            "fares_count": len(self.fares),
            "http_status": self.http_status,
            "latency_ms": self.latency_ms,
            "error_code": self.error_code,
        }


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _money(value: float | int | Decimal | str) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"))


def _redact(text: str, api_key: str | None) -> str:
    if not text:
        return text
    out = text
    if api_key:
        out = out.replace(api_key, "[REDACTED]")
    # Common query forms
    out = out.replace("apiKey=", "apiKey=[REDACTED]&").replace(
        "apiKey=[REDACTED]&[REDACTED]", "apiKey=[REDACTED]"
    )
    return out


def _result(
    *,
    amount: Decimal = Decimal("0.00"),
    currency: str = EXPECTED_CURRENCY,
    status: TollStatus,
    systems: tuple[str, ...] = (),
    fares: tuple[TollFareInfo, ...] = (),
    http_status: int | None = None,
    latency_ms: int | None = None,
    error_code: str | None = None,
) -> TollEstimateResult:
    return TollEstimateResult(
        amount=amount,
        currency=currency,
        source="here",
        status=status,
        calculated_at=_now(),
        systems=systems,
        fares=fares,
        http_status=http_status,
        latency_ms=latency_ms,
        error_code=error_code,
    )


def _fare_price(fare: dict[str, Any]) -> tuple[str | None, float | None]:
    """Prefer convertedPrice in requested currency, else price. Aligned with spike."""
    for key in ("convertedPrice", "price"):
        p = fare.get(key)
        if isinstance(p, dict) and p.get("type") == "value":
            cur = p.get("currency")
            val = p.get("value")
            if val is not None:
                try:
                    return (str(cur) if cur else None, float(val))
                except (TypeError, ValueError):
                    continue
    return None, None


def parse_here_tolls_payload(data: dict[str, Any]) -> dict[str, Any]:
    """Parse HERE v8 routes JSON (first route). Pure — no HTTP.

    Returns dict with: toll_total, toll_currency, systems, fares, missing_fields,
    has_routes. Mirrors spike preference: summary.tolls.total over fare sum.
    """
    out: dict[str, Any] = {
        "toll_total": None,
        "toll_currency": None,
        "systems": [],
        "fares": [],
        "missing_fields": [],
        "has_routes": False,
    }
    routes = data.get("routes") or []
    if not isinstance(routes, list) or not routes:
        out["missing_fields"].append("routes")
        return out

    route = routes[0]
    if not isinstance(route, dict):
        out["missing_fields"].append("routes")
        return out
    out["has_routes"] = True

    sections = route.get("sections") or []
    if not isinstance(sections, list) or not sections:
        out["missing_fields"].append("sections")

    seen_fare_ids: set[str] = set()
    systems: set[str] = set()
    total_from_fares = 0.0
    fare_currency: str | None = None
    summary_total: float | None = None
    summary_currency: str | None = None
    fare_infos: list[TollFareInfo] = []

    for sec in sections if isinstance(sections, list) else []:
        if not isinstance(sec, dict):
            continue
        summary = sec.get("summary") or {}
        if isinstance(summary, dict):
            tolls_sum = summary.get("tolls")
            if isinstance(tolls_sum, dict):
                tot = tolls_sum.get("total")
                if isinstance(tot, dict) and tot.get("type") == "value":
                    try:
                        summary_total = (summary_total or 0.0) + float(tot["value"])
                        summary_currency = str(
                            tot.get("currency") or summary_currency or ""
                        )
                    except (KeyError, TypeError, ValueError):
                        pass

        for ts in sec.get("tollSystems") or []:
            if isinstance(ts, dict) and ts.get("name"):
                systems.add(str(ts["name"]))

        for toll in sec.get("tolls") or []:
            if not isinstance(toll, dict):
                continue
            system_name = toll.get("tollSystem")
            if system_name:
                systems.add(str(system_name))
            for fare in toll.get("fares") or []:
                if not isinstance(fare, dict):
                    continue
                fid = fare.get("id")
                fid_s = str(fid) if fid is not None else None
                if fid_s and fid_s in seen_fare_ids:
                    continue
                if fid_s:
                    seen_fare_ids.add(fid_s)
                cur, val = _fare_price(fare)
                if fare_currency is None and cur:
                    fare_currency = cur
                if val is not None:
                    total_from_fares += val
                fare_infos.append(
                    TollFareInfo(
                        name=fare.get("name"),
                        currency=cur,
                        value=val,
                        toll_system=str(system_name) if system_name else None,
                        payment_methods=tuple(fare.get("paymentMethods") or []),
                        fare_id=fid_s,
                    )
                )

    out["systems"] = sorted(systems)
    out["fares"] = fare_infos

    if summary_total is not None:
        out["toll_total"] = round(summary_total, 2)
        out["toll_currency"] = summary_currency or fare_currency or EXPECTED_CURRENCY
    elif fare_infos:
        out["toll_total"] = round(total_from_fares, 2)
        out["toll_currency"] = fare_currency or EXPECTED_CURRENCY
    else:
        # Valid route with no toll sections → zero
        out["toll_total"] = 0.0
        out["toll_currency"] = EXPECTED_CURRENCY

    return out


def _payload_to_result(
    parsed: dict[str, Any],
    *,
    http_status: int,
    latency_ms: int,
) -> TollEstimateResult:
    if not parsed.get("has_routes") or "routes" in (parsed.get("missing_fields") or []):
        return _result(
            status="error",
            http_status=http_status,
            latency_ms=latency_ms,
            error_code=ERR_MISSING_FIELDS,
        )

    currency = str(parsed.get("toll_currency") or EXPECTED_CURRENCY).upper()
    if currency and currency != EXPECTED_CURRENCY:
        return _result(
            status="error",
            currency=currency,
            http_status=http_status,
            latency_ms=latency_ms,
            error_code=ERR_CURRENCY,
            systems=tuple(parsed.get("systems") or ()),
            fares=tuple(parsed.get("fares") or ()),
        )

    amount = _money(parsed.get("toll_total") or 0)
    systems = tuple(parsed.get("systems") or ())
    fares = tuple(parsed.get("fares") or ())
    if amount == Decimal("0.00"):
        return _result(
            amount=amount,
            status="no_tolls",
            systems=systems,
            fares=fares,
            http_status=http_status,
            latency_ms=latency_ms,
        )
    return _result(
        amount=amount,
        status="ok",
        systems=systems,
        fares=fares,
        http_status=http_status,
        latency_ms=latency_ms,
    )


def _map_http_error(status_code: int) -> str:
    if status_code in (401, 403):
        return ERR_AUTH
    if status_code == 429:
        return ERR_RATE_LIMITED
    if 500 <= status_code <= 599:
        return ERR_HTTP_5XX
    if 400 <= status_code <= 499:
        return ERR_HTTP_4XX
    return ERR_HTTP_5XX


def _should_retry(exc: BaseException | None, status_code: int | None) -> bool:
    if status_code is not None and 500 <= status_code <= 599:
        return True
    if isinstance(exc, (httpx.TimeoutException, httpx.ConnectError, httpx.NetworkError)):
        return True
    return False


def estimate_tolls(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
    *,
    settings: Settings | None = None,
    client: httpx.Client | None = None,
) -> TollEstimateResult:
    """Fetch toll estimate from HERE Routing v8 (or flag_off / config error).

    Never raises for HERE/network failures — returns TollEstimateResult with status=error.
    Never logs or embeds the API key.
    """
    cfg = settings if settings is not None else app_settings

    if not bool(getattr(cfg, "ENABLE_HERE_TOLLS", False)):
        return _result(status="flag_off")

    api_key = getattr(cfg, "HERE_API_KEY", None)
    if api_key is not None:
        api_key = str(api_key).strip() or None
    if not api_key:
        logger.warning(
            "here_tolls_config_error",
            extra={"error_code": ERR_MISSING_API_KEY},
        )
        return _result(status="error", error_code=ERR_MISSING_API_KEY)

    params = {
        "origin": f"{origin_lat},{origin_lng}",
        "destination": f"{dest_lat},{dest_lng}",
        "transportMode": "car",
        "return": "summary,tolls",
        "currency": EXPECTED_CURRENCY,
        "tolls[summaries]": "total",
        "lang": "pt-PT",
        "apiKey": api_key,
    }
    timeout = httpx.Timeout(READ_TIMEOUT_S, connect=CONNECT_TIMEOUT_S)
    owns_client = client is None
    http = client or httpx.Client(timeout=timeout)

    started = time.perf_counter()
    last_error: TollEstimateResult | None = None
    attempts = 1 + MAX_RETRIES

    try:
        for attempt in range(attempts):
            try:
                # Do not log request URL (contains apiKey).
                resp = http.get(HERE_ROUTES_URL, params=params)
            except httpx.TimeoutException:
                latency_ms = int((time.perf_counter() - started) * 1000)
                last_error = _result(
                    status="error",
                    latency_ms=latency_ms,
                    error_code=ERR_TIMEOUT,
                )
                if attempt < attempts - 1 and _should_retry(
                    httpx.TimeoutException("t"), None
                ):
                    continue
                return last_error
            except (httpx.ConnectError, httpx.NetworkError) as exc:
                latency_ms = int((time.perf_counter() - started) * 1000)
                logger.warning(
                    "here_tolls_connection_error type=%s",
                    type(exc).__name__,
                )
                last_error = _result(
                    status="error",
                    latency_ms=latency_ms,
                    error_code=ERR_CONNECTION,
                )
                if attempt < attempts - 1:
                    continue
                return last_error
            except httpx.HTTPError as exc:
                latency_ms = int((time.perf_counter() - started) * 1000)
                logger.warning(
                    "here_tolls_http_error type=%s detail=%s",
                    type(exc).__name__,
                    _redact(str(exc), api_key),
                )
                return _result(
                    status="error",
                    latency_ms=latency_ms,
                    error_code=ERR_CONNECTION,
                )

            latency_ms = int((time.perf_counter() - started) * 1000)
            status_code = resp.status_code

            if status_code >= 400:
                code = _map_http_error(status_code)
                last_error = _result(
                    status="error",
                    http_status=status_code,
                    latency_ms=latency_ms,
                    error_code=code,
                )
                if attempt < attempts - 1 and _should_retry(None, status_code):
                    continue
                return last_error

            try:
                data = resp.json()
            except (json.JSONDecodeError, ValueError):
                return _result(
                    status="error",
                    http_status=status_code,
                    latency_ms=latency_ms,
                    error_code=ERR_INVALID_JSON,
                )

            if not isinstance(data, dict):
                return _result(
                    status="error",
                    http_status=status_code,
                    latency_ms=latency_ms,
                    error_code=ERR_INVALID_JSON,
                )

            parsed = parse_here_tolls_payload(data)
            return _payload_to_result(
                parsed, http_status=status_code, latency_ms=latency_ms
            )

        return last_error or _result(status="error", error_code=ERR_CONNECTION)
    finally:
        if owns_client:
            http.close()


__all__ = [
    "TollEstimateResult",
    "TollFareInfo",
    "estimate_tolls",
    "parse_here_tolls_payload",
    "HERE_ROUTES_URL",
    "EXPECTED_CURRENCY",
    "ERR_MISSING_API_KEY",
    "ERR_TIMEOUT",
    "ERR_CONNECTION",
    "ERR_AUTH",
    "ERR_RATE_LIMITED",
    "ERR_HTTP_4XX",
    "ERR_HTTP_5XX",
    "ERR_INVALID_JSON",
    "ERR_CURRENCY",
]
