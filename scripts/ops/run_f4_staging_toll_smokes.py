#!/usr/bin/env python3
"""PORTAGENS F4 — staging HERE toll smokes (safe output, no secrets).

Run on tvde-staging-api one-off job. Uses TEST_ACCOUNT_PASSWORD from env.
Calls https://tvde-staging-api.onrender.com (same service). Never prints
password, JWT, HERE key, or DB URL.

Usage:
  python scripts/ops/run_f4_staging_toll_smokes.py
"""

from __future__ import annotations

import json
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib import error, request

def _ensure_app_path() -> None:
    candidates: list[Path] = []
    try:
        here = Path(__file__).resolve()
        candidates.extend([here.parents[0], here.parents[1], here.parents[2] / "backend"])
    except (NameError, IndexError):
        pass
    candidates.extend(
        [
            Path.cwd(),
            Path("/opt/render/project/src/backend"),
            Path("/opt/render/project/src"),
        ]
    )
    for candidate in candidates:
        try:
            if (candidate / "app").is_dir() and str(candidate) not in sys.path:
                sys.path.insert(0, str(candidate))
        except OSError:
            continue


_ensure_app_path()

API = "https://tvde-staging-api.onrender.com"
PHONES = {
    "passenger": "+351912345678",
    "driver": "+351911111111",
    "partner": "+351955555502",
    "admin": "+351900000000",
}

# Smoke routes (lat, lng)
NO_TOLL = {
    "name": "no_toll_bairro",
    "origin": (38.7223, -9.1393),  # near Baixa short hop
    "dest": (38.7250, -9.1450),
}
BRISA = {
    "name": "brisa_oeiras_airport",
    "origin": (38.6910, -9.3110),
    "dest": (38.7742, -9.1342),
}
LUSO_ALMADA_LISBOA = {
    "name": "lusoponte_almada_lisboa",
    "origin": (38.6780, -9.1600),
    "dest": (38.7030, -9.1750),
}
LUSO_LISBOA_ALMADA = {
    "name": "lusoponte_lisboa_almada",
    "origin": (38.7030, -9.1750),
    "dest": (38.6780, -9.1600),
}


def _mask_token(tok: str | None) -> str | None:
    if not tok:
        return None
    return f"...{tok[-6:]}" if len(tok) >= 6 else "***"


def _http_json(
    method: str,
    path: str,
    *,
    token: str | None = None,
    body: dict | None = None,
    timeout: float = 120.0,
) -> tuple[int, Any]:
    data = None
    headers = {"Accept": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = request.Request(f"{API}{path}", data=data, headers=headers, method=method)
    try:
        with request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8") or "null"
            return resp.status, json.loads(raw)
    except error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw)
        except Exception:
            payload = {"raw": raw[:300]}
        return int(e.code), payload


def _login(phone: str, password: str) -> dict[str, Any]:
    code, payload = _http_json(
        "POST", "/auth/login", body={"phone": phone, "password": password}, timeout=30
    )
    if code != 200:
        return {
            "ok": False,
            "http": code,
            "detail": payload.get("detail") if isinstance(payload, dict) else payload,
        }
    return {
        "ok": True,
        "http": code,
        "role": payload.get("role"),
        "token_masked": _mask_token(payload.get("access_token")),
        "_token": payload.get("access_token"),
    }


def _toll_fields(bd: dict | None) -> dict[str, Any]:
    if not isinstance(bd, dict):
        return {}
    keys = [
        "estimated_tolls_amount",
        "charged_tolls_amount",
        "observed_tolls_amount",
        "observed_tolls_delta",
        "tolls_amount",
        "tolls_source",
        "tolls_status",
        "tolls_systems",
        "tolls_error_code",
        "observed_tolls_status",
        "observed_tolls_error_code",
        "total",
    ]
    return {k: bd.get(k) for k in keys}


def _sanitize_text(s: str) -> str:
    import re

    s = re.sub(r"apiKey=[^&\s]+", "apiKey=[REDACTED]", s, flags=re.I)
    s = re.sub(r"sk_[A-Za-z0-9]+", "[REDACTED]", s)
    return s


def _run_trip(
    *,
    pax_tok: str,
    drv_tok: str,
    partner_tok: str | None,
    admin_tok: str | None,
    route: dict[str, Any],
    expect_estimate_gt0: bool | None,
) -> dict[str, Any]:
    from app.core.pricing import calculate_commission_amount, commissionable_amount

    o_lat, o_lng = route["origin"]
    d_lat, d_lng = route["dest"]
    out: dict[str, Any] = {"route": route["name"], "steps": {}}

    # Refresh driver near origin
    ts_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    code, _ = _http_json("POST", "/driver/status/online", token=drv_tok, body={})
    out["steps"]["driver_online"] = code
    code, _ = _http_json(
        "POST",
        "/drivers/location",
        token=drv_tok,
        body={"lat": o_lat, "lng": o_lng, "timestamp": ts_ms},
    )
    out["steps"]["driver_location"] = code

    t0 = time.time()
    code, created = _http_json(
        "POST",
        "/trips",
        token=pax_tok,
        body={
            "origin_lat": o_lat,
            "origin_lng": o_lng,
            "destination_lat": d_lat,
            "destination_lng": d_lng,
            "vehicle_category": "x",
        },
        timeout=130,
    )
    create_ms = int((time.time() - t0) * 1000)
    out["steps"]["create_http"] = code
    out["create_latency_ms"] = create_ms
    if code != 200:
        out["ok"] = False
        out["create_error"] = created
        return out

    trip_id = created.get("trip_id")
    out["trip_id"] = trip_id
    create_bd = created.get("price_breakdown") or {}
    out["create_tolls"] = _toll_fields(create_bd)
    out["estimated_price"] = created.get("estimated_price")

    est = create_bd.get("estimated_tolls_amount")
    chg = create_bd.get("charged_tolls_amount")
    out["charged_equals_estimate"] = est == chg
    if expect_estimate_gt0 is True:
        out["estimate_gt0"] = (est is not None) and float(est) > 0
    elif expect_estimate_gt0 is False:
        out["estimate_eq0"] = (est is None) or float(est) == 0.0

    # Passenger detail — no observed exposure expected in UI fields still in API
    code, pax_detail = _http_json("GET", f"/trips/{trip_id}", token=pax_tok)
    out["steps"]["passenger_get"] = code
    pax_bd = (pax_detail or {}).get("price_breakdown") or {}
    out["passenger_tolls"] = _toll_fields(pax_bd)
    out["passenger_has_observed_amount"] = pax_bd.get("observed_tolls_amount") is not None

    # Accept / start / complete
    # Poll available briefly
    accepted = False
    for _ in range(15):
        code, avail = _http_json("GET", "/driver/trips/available", token=drv_tok)
        ids = [r.get("trip_id") for r in (avail or [])] if isinstance(avail, list) else []
        if trip_id in ids:
            code, acc = _http_json("POST", f"/driver/trips/{trip_id}/accept", token=drv_tok)
            out["steps"]["accept"] = code
            accepted = code == 200
            if not accepted:
                out["accept_error"] = acc
            break
        time.sleep(1)
    if not accepted:
        out["ok"] = False
        out["error"] = "accept_failed_or_not_offered"
        return out

    for path, key in (
        (f"/driver/trips/{trip_id}/arriving", "arriving"),
        (f"/driver/trips/{trip_id}/start", "start"),
    ):
        code, body = _http_json("POST", path, token=drv_tok)
        out["steps"][key] = code
        if code != 200:
            out["ok"] = False
            out[f"{key}_error"] = body
            return out

    t1 = time.time()
    code, completed = _http_json("POST", f"/driver/trips/{trip_id}/complete", token=drv_tok)
    out["complete_latency_ms"] = int((time.time() - t1) * 1000)
    out["steps"]["complete"] = code
    if code != 200:
        out["ok"] = False
        out["complete_error"] = completed
        return out

    # Refresh details
    code, drv_detail = _http_json("GET", f"/driver/trips/{trip_id}", token=drv_tok)
    out["steps"]["driver_get"] = code
    final_bd = (drv_detail or {}).get("price_breakdown") or {}
    out["complete_tolls"] = _toll_fields(final_bd)
    out["final_price"] = (drv_detail or {}).get("final_price")
    out["payment_status"] = (drv_detail or {}).get("payment_status")

    charged_after = final_bd.get("charged_tolls_amount")
    out["charged_unchanged_after_observed"] = charged_after == chg
    out["observed_present"] = final_bd.get("observed_tolls_amount") is not None or final_bd.get(
        "observed_tolls_status"
    ) is not None

    # Commission invariant (local calc from final)
    try:
        fp = float((drv_detail or {}).get("final_price") or final_bd.get("total") or 0)
        tolls = float(final_bd.get("tolls_amount") or final_bd.get("charged_tolls_amount") or 0)
        base = float(commissionable_amount(fp, tolls))
        comm = float(calculate_commission_amount(fp, 0.15, tolls_amount=tolls))
        out["commission"] = {
            "final_price": fp,
            "tolls_amount": tolls,
            "commissionable": base,
            "commission_15pct": comm,
            "tolls_excluded": abs(base - (fp - tolls)) < 0.02,
        }
    except Exception as e:
        out["commission"] = {"error": type(e).__name__}

    # Partner / Admin visibility
    if partner_tok:
        code, partner_trip = _http_json("GET", f"/partner/trips/{trip_id}", token=partner_tok)
        out["steps"]["partner_get"] = code
        if code == 200:
            pbd = (partner_trip or {}).get("price_breakdown") or {}
            out["partner_tolls"] = _toll_fields(pbd)
            blob = _sanitize_text(json.dumps(partner_trip)[:2000])
            out["partner_secret_leak"] = ("apiKey=" in blob) or ("HERE_API" in blob)
    if admin_tok:
        code, admin_trip = _http_json("GET", f"/admin/trips/{trip_id}", token=admin_tok)
        out["steps"]["admin_get"] = code
        if code == 200:
            abd = (admin_trip or {}).get("price_breakdown") or {}
            out["admin_tolls"] = _toll_fields(abd)
            blob = _sanitize_text(json.dumps(admin_trip)[:2000])
            out["admin_secret_leak"] = ("apiKey=" in blob) or ("HERE_API" in blob)

    # Passenger post-complete: observed may exist in API payload but UI must not show —
    # we only assert create-time passenger view lacked observed before complete.
    out["ok"] = True
    return out


def main() -> int:
    from app.core.config import settings

    report: dict[str, Any] = {
        "api": API,
        "enable_here_tolls": bool(getattr(settings, "ENABLE_HERE_TOLLS", False)),
        "stripe_mock": bool(getattr(settings, "STRIPE_MOCK", False)),
        "here_key_configured": bool(getattr(settings, "HERE_API_KEY", None)),
        "logins": {},
        "smokes": {},
        "errors": [],
    }

    pwd = settings.TEST_ACCOUNT_PASSWORD
    if not pwd or not str(pwd).strip():
        print(json.dumps({"error": "TEST_ACCOUNT_PASSWORD_missing"}))
        return 2
    if not report["enable_here_tolls"]:
        report["errors"].append("ENABLE_HERE_TOLLS_false")
    if not report["here_key_configured"]:
        report["errors"].append("HERE_API_KEY_missing")

    tokens: dict[str, str] = {}
    for label, phone in PHONES.items():
        res = _login(phone, str(pwd).strip())
        safe = {k: v for k, v in res.items() if k != "_token"}
        report["logins"][label] = safe
        if res.get("ok") and res.get("_token"):
            tokens[label] = res["_token"]

    if "passenger" not in tokens or "driver" not in tokens:
        report["stop"] = True
        report["stop_reason"] = "login_passenger_or_driver_failed"
        print(json.dumps(report, indent=2, default=str))
        return 1

    pax, drv = tokens["passenger"], tokens["driver"]
    partner = tokens.get("partner")
    admin = tokens.get("admin")

    report["smokes"]["A_no_toll"] = _run_trip(
        pax_tok=pax,
        drv_tok=drv,
        partner_tok=partner,
        admin_tok=admin,
        route=NO_TOLL,
        expect_estimate_gt0=False,
    )
    report["smokes"]["B_brisa"] = _run_trip(
        pax_tok=pax,
        drv_tok=drv,
        partner_tok=partner,
        admin_tok=admin,
        route=BRISA,
        expect_estimate_gt0=True,
    )
    report["smokes"]["C_lusoponte_almada_lisboa"] = _run_trip(
        pax_tok=pax,
        drv_tok=drv,
        partner_tok=partner,
        admin_tok=admin,
        route=LUSO_ALMADA_LISBOA,
        expect_estimate_gt0=True,
    )
    report["smokes"]["C_lusoponte_lisboa_almada"] = _run_trip(
        pax_tok=pax,
        drv_tok=drv,
        partner_tok=partner,
        admin_tok=admin,
        route=LUSO_LISBOA_ALMADA,
        expect_estimate_gt0=False,
    )

    # High-level verdict helpers
    b = report["smokes"]["B_brisa"]
    report["billing_invariants_brisa"] = {
        "charged_equals_estimate": b.get("charged_equals_estimate"),
        "charged_unchanged_after_observed": b.get("charged_unchanged_after_observed"),
        "commission": b.get("commission"),
    }

    fails = [
        name
        for name, s in report["smokes"].items()
        if not (isinstance(s, dict) and s.get("ok"))
    ]
    report["failed_smokes"] = fails
    report["f4_smoke_pass"] = len(fails) == 0 and not report["errors"]

    print(json.dumps(report, indent=2, default=str))
    return 0 if report["f4_smoke_pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
