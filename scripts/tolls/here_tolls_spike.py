#!/usr/bin/env python3
"""Spike isolado — HERE Routing API v8 tolls (Portugal).

NÃO liga a trip create/complete, Stripe, DB ou frontend.

Uso:
  set HERE_API_KEY=...
  python scripts/tolls/here_tolls_spike.py
  python scripts/tolls/here_tolls_spike.py --write-report

Raw JSON (gitignored via tmp/):
  tmp/here-tolls/<slug>.json
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

HERE_ROUTES_URL = "https://router.hereapi.com/v8/routes"
REPO_ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = REPO_ROOT / "tmp" / "here-tolls"
REPORT_PATH = REPO_ROOT / "docs" / "analysis" / "HERE_TOLLS_SPIKE_2026-09.md"

# transportMode=car only (no taxi beta / truck)
DEFAULT_RETURN = "summary,tolls,polyline"
CURRENCY = "EUR"


@dataclass(frozen=True)
class BenchmarkRoute:
    name: str
    origin_label: str
    dest_label: str
    origin: tuple[float, float]  # lat, lng
    destination: tuple[float, float]
    avoid_compare: bool = False


# Approximate public centroids / known points (sufficient for spike routing).
ROUTES: list[BenchmarkRoute] = [
    BenchmarkRoute(
        "Oeiras → Aeroporto Lisboa",
        "Oeiras",
        "Aeroporto Humberto Delgado",
        (38.6910, -9.3110),
        (38.7742, -9.1342),
        avoid_compare=True,
    ),
    BenchmarkRoute(
        "Lisboa → Cascais",
        "Lisboa (Baixa)",
        "Cascais",
        (38.7071, -9.1355),
        (38.6979, -9.4215),
        avoid_compare=True,
    ),
    BenchmarkRoute(
        "Lisboa → Setúbal",
        "Lisboa (Baixa)",
        "Setúbal",
        (38.7071, -9.1355),
        (38.5244, -8.8926),
        avoid_compare=True,
    ),
    BenchmarkRoute(
        "Lisboa → Almada (Ponte 25 de Abril)",
        "Lisboa (Alcântara)",
        "Almada",
        (38.7030, -9.1750),
        (38.6780, -9.1600),
    ),
    BenchmarkRoute(
        "Lisboa → Montijo (Ponte Vasco da Gama)",
        "Lisboa (Parque das Nações)",
        "Montijo",
        (38.7680, -9.0940),
        (38.7069, -8.9739),
    ),
    BenchmarkRoute(
        "Lisboa → Porto",
        "Lisboa (Baixa)",
        "Porto (Aliados)",
        (38.7071, -9.1355),
        (41.1496, -8.6110),
    ),
    BenchmarkRoute(
        "Lisboa → Faro",
        "Lisboa (Baixa)",
        "Faro",
        (38.7071, -9.1355),
        (37.0194, -7.9304),
    ),
    BenchmarkRoute(
        "Lisboa → Évora (A6)",
        "Lisboa (Baixa)",
        "Évora",
        (38.7071, -9.1355),
        (38.5713, -7.9097),
    ),
]


@dataclass
class TollFare:
    fare_id: str | None
    name: str | None
    currency: str | None
    value: float | None
    payment_methods: list[str] = field(default_factory=list)
    reason: str | None = None


@dataclass
class RouteTollResult:
    route_name: str
    mode: str  # default | avoid_tolls
    origin: str
    destination: str
    http_status: int | None
    error: str | None
    distance_m: float | None = None
    duration_s: float | None = None
    toll_total: float | None = None
    toll_currency: str | None = None
    toll_systems: list[str] = field(default_factory=list)
    fares: list[TollFare] = field(default_factory=list)
    section_toll_count: int = 0
    route_id: str | None = None
    notices: list[str] = field(default_factory=list)
    missing_fields: list[str] = field(default_factory=list)
    raw_path: str | None = None


def _slug(name: str, mode: str) -> str:
    base = "".join(c if c.isalnum() else "_" for c in name.lower())
    return f"{base}_{mode}"[:120]


def _fare_price(fare: dict[str, Any]) -> tuple[str | None, float | None]:
    """Prefer convertedPrice in requested currency, else price."""
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


def parse_route_payload(data: dict[str, Any]) -> dict[str, Any]:
    """Extract diagnostics from HERE v8 routes response (first route)."""
    out: dict[str, Any] = {
        "distance_m": None,
        "duration_s": None,
        "toll_total": None,
        "toll_currency": None,
        "toll_systems": [],
        "fares": [],
        "section_toll_count": 0,
        "route_id": None,
        "notices": [],
        "missing_fields": [],
    }
    notices = data.get("notices") or []
    if isinstance(notices, list):
        for n in notices:
            if isinstance(n, dict):
                out["notices"].append(
                    f"{n.get('code') or n.get('title') or n}: {n.get('message') or ''}".strip()
                )
            else:
                out["notices"].append(str(n))

    routes = data.get("routes") or []
    if not routes:
        out["missing_fields"].append("routes")
        return out

    route = routes[0]
    out["route_id"] = route.get("id")
    sections = route.get("sections") or []
    if not sections:
        out["missing_fields"].append("sections")

    seen_fare_ids: set[str] = set()
    systems: set[str] = set()
    total_from_fares = 0.0
    fare_currency: str | None = None
    summary_total: float | None = None
    summary_currency: str | None = None
    distance = 0.0
    duration = 0.0

    for sec in sections:
        if not isinstance(sec, dict):
            continue
        summary = sec.get("summary") or {}
        if isinstance(summary, dict):
            distance += float(summary.get("length") or 0)
            duration += float(summary.get("duration") or 0)
            tolls_sum = summary.get("tolls")
            if isinstance(tolls_sum, dict):
                tot = tolls_sum.get("total")
                if isinstance(tot, dict) and tot.get("type") == "value":
                    try:
                        summary_total = (summary_total or 0.0) + float(tot["value"])
                        summary_currency = str(tot.get("currency") or summary_currency or "")
                    except (KeyError, TypeError, ValueError):
                        pass

        for ts in sec.get("tollSystems") or []:
            if isinstance(ts, dict) and ts.get("name"):
                systems.add(str(ts["name"]))

        for toll in sec.get("tolls") or []:
            if not isinstance(toll, dict):
                continue
            out["section_toll_count"] += 1
            if toll.get("tollSystem"):
                systems.add(str(toll["tollSystem"]))
            for fare in toll.get("fares") or []:
                if not isinstance(fare, dict):
                    continue
                fid = fare.get("id")
                fid_s = str(fid) if fid is not None else None
                # Multi-leg: same fare id must only count once
                if fid_s and fid_s in seen_fare_ids:
                    continue
                if fid_s:
                    seen_fare_ids.add(fid_s)
                cur, val = _fare_price(fare)
                if fare_currency is None and cur:
                    fare_currency = cur
                if val is not None:
                    total_from_fares += val
                out["fares"].append(
                    {
                        "fare_id": fid_s,
                        "name": fare.get("name"),
                        "currency": cur,
                        "value": val,
                        "payment_methods": list(fare.get("paymentMethods") or []),
                        "reason": fare.get("reason"),
                    }
                )

    out["distance_m"] = distance or None
    out["duration_s"] = duration or None
    out["toll_systems"] = sorted(systems)

    if summary_total is not None:
        out["toll_total"] = round(summary_total, 2)
        out["toll_currency"] = summary_currency or fare_currency
    elif out["fares"]:
        out["toll_total"] = round(total_from_fares, 2)
        out["toll_currency"] = fare_currency
    else:
        out["toll_total"] = 0.0
        out["toll_currency"] = CURRENCY
        if out["section_toll_count"] == 0:
            out["missing_fields"].append("tolls_or_zero")

    return out


def here_request(
    *,
    api_key: str,
    origin: tuple[float, float],
    destination: tuple[float, float],
    avoid_tolls: bool,
) -> tuple[int, dict[str, Any] | None, str | None]:
    params: list[tuple[str, str]] = [
        ("origin", f"{origin[0]},{origin[1]}"),
        ("destination", f"{destination[0]},{destination[1]}"),
        ("transportMode", "car"),
        ("return", DEFAULT_RETURN),
        ("currency", CURRENCY),
        ("tolls[summaries]", "total"),
        ("lang", "pt-PT"),
        ("apiKey", api_key),
    ]
    if avoid_tolls:
        params.append(("avoid[features]", "tollRoad"))

    url = f"{HERE_ROUTES_URL}?{urllib.parse.urlencode(params)}"
    # Do not log URL (contains apiKey)
    req = urllib.request.Request(url, method="GET", headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            status = resp.getcode() or 0
            body = resp.read().decode("utf-8", errors="replace")
            try:
                return status, json.loads(body), None
            except json.JSONDecodeError as e:
                return status, None, f"invalid_json: {e}"
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace") if e.fp else ""
        try:
            payload = json.loads(err_body) if err_body else None
        except json.JSONDecodeError:
            payload = {"raw": err_body[:2000]}
        return int(e.code), payload, f"http_error: {e.code}"
    except Exception as e:  # noqa: BLE001 — spike diagnostics
        return None, None, f"{type(e).__name__}: {e}"


def run_one(
    route: BenchmarkRoute,
    *,
    api_key: str,
    avoid_tolls: bool,
    save_raw: bool,
) -> RouteTollResult:
    mode = "avoid_tolls" if avoid_tolls else "default"
    status, payload, err = here_request(
        api_key=api_key,
        origin=route.origin,
        destination=route.destination,
        avoid_tolls=avoid_tolls,
    )
    raw_path = None
    if save_raw and payload is not None:
        RAW_DIR.mkdir(parents=True, exist_ok=True)
        path = RAW_DIR / f"{_slug(route.name, mode)}.json"
        path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        raw_path = str(path.relative_to(REPO_ROOT))

    result = RouteTollResult(
        route_name=route.name,
        mode=mode,
        origin=route.origin_label,
        destination=route.dest_label,
        http_status=status,
        error=err,
        raw_path=raw_path,
    )
    if not payload or err and status and status >= 400:
        if payload and isinstance(payload, dict):
            # still try notices
            for n in payload.get("notices") or []:
                result.notices.append(str(n))
        return result

    parsed = parse_route_payload(payload)
    result.distance_m = parsed["distance_m"]
    result.duration_s = parsed["duration_s"]
    result.toll_total = parsed["toll_total"]
    result.toll_currency = parsed["toll_currency"]
    result.toll_systems = list(parsed["toll_systems"])
    result.fares = [TollFare(**f) for f in parsed["fares"]]
    result.section_toll_count = int(parsed["section_toll_count"])
    result.route_id = parsed["route_id"]
    result.notices = list(parsed["notices"])
    result.missing_fields = list(parsed["missing_fields"])
    return result


def print_result(r: RouteTollResult) -> None:
    dist_km = f"{r.distance_m / 1000:.1f} km" if r.distance_m else "—"
    dur_min = f"{r.duration_s / 60:.0f} min" if r.duration_s else "—"
    toll = (
        f"{r.toll_total:.2f} {r.toll_currency or ''}".strip()
        if r.toll_total is not None
        else "—"
    )
    print(f"\n=== {r.route_name} [{r.mode}] ===")
    print(f"  origin/dest : {r.origin} → {r.destination}")
    print(f"  HTTP        : {r.http_status}")
    if r.error:
        print(f"  error       : {r.error}")
    print(f"  distance    : {dist_km}")
    print(f"  duration    : {dur_min}")
    print(f"  toll total  : {toll}")
    print(f"  systems     : {', '.join(r.toll_systems) or '—'}")
    print(f"  section tolls: {r.section_toll_count}")
    print(f"  route id    : {r.route_id or '—'}")
    if r.fares:
        print("  fares:")
        for f in r.fares:
            print(
                f"    - {f.name or '?'} | {f.value} {f.currency} | "
                f"id={f.fare_id} | methods={','.join(f.payment_methods) or '-'}"
            )
    if r.notices:
        print(f"  notices     : {r.notices}")
    if r.missing_fields:
        print(f"  missing     : {r.missing_fields}")
    if r.raw_path:
        print(f"  raw         : {r.raw_path}")


def build_report_markdown(results: list[RouteTollResult], *, ran_at: str) -> str:
    defaults = [r for r in results if r.mode == "default"]
    avoids = [r for r in results if r.mode == "avoid_tolls"]

    lines: list[str] = [
        "# HERE Tolls Spike — Portugal (2026-09)",
        "",
        "**Tipo:** spike técnico isolado (sem runtime app)",
        f"**Corrido em:** {ran_at}",
        "**API:** HERE Routing v8 `GET https://router.hereapi.com/v8/routes`",
        "**Modo:** `transportMode=car` · `return=summary,tolls,polyline` · "
        f"`currency={CURRENCY}` · `tolls[summaries]=total`",
        "**Avoid:** `avoid[features]=tollRoad` (comparação em subset)",
        "",
        "Valores oficiais de tarifário PT: **OFFICIAL VALUE NOT VERIFIED** "
        "(sem tabela oficial no repo para confronto).",
        "",
        "---",
        "",
        "## Tabela benchmark (default)",
        "",
        "| Rota | HERE toll € | Toll detectado? | Breakdown? | Observações |",
        "|------|------------:|:---------------:|:----------:|-------------|",
    ]

    for r in defaults:
        detected = "SIM" if (r.toll_total or 0) > 0 or r.section_toll_count > 0 else "NÃO"
        if r.error or (r.http_status and r.http_status >= 400):
            detected = "ERRO"
        breakdown = "SIM" if r.fares else "NÃO"
        toll_s = (
            f"{r.toll_total:.2f}"
            if r.toll_total is not None and not r.error
            else "—"
        )
        notes: list[str] = []
        if r.error:
            notes.append(r.error)
        if r.toll_systems:
            notes.append("systems: " + "; ".join(r.toll_systems[:4]))
        if r.toll_currency and r.toll_currency.upper() != "EUR":
            notes.append(f"currency={r.toll_currency}")
        if r.notices:
            notes.append("notices")
        if not notes:
            notes.append("OFFICIAL VALUE NOT VERIFIED")
        lines.append(
            f"| {r.route_name} | {toll_s} | {detected} | {breakdown} | "
            f"{'; '.join(notes)} |"
        )

    lines.extend(
        [
            "",
            "## Comparação avoid tolls",
            "",
            "| Rota | Dist default | Dist avoid | Dur default | Dur avoid | Toll default | Toll avoid |",
            "|------|-------------:|-----------:|------------:|----------:|-------------:|-----------:|",
        ]
    )
    by_name = {r.route_name: r for r in defaults}
    for a in avoids:
        d = by_name.get(a.route_name)
        if not d:
            continue

        def _km(x: RouteTollResult) -> str:
            return f"{x.distance_m/1000:.1f}" if x.distance_m else "—"

        def _min(x: RouteTollResult) -> str:
            return f"{x.duration_s/60:.0f}" if x.duration_s else "—"

        def _t(x: RouteTollResult) -> str:
            return f"{x.toll_total:.2f}" if x.toll_total is not None else "—"

        lines.append(
            f"| {a.route_name} | {_km(d)} | {_km(a)} | {_min(d)} | {_min(a)} | "
            f"{_t(d)} | {_t(a)} |"
        )

    # Quality / gaps
    missing_toll_expected = [
        r.route_name
        for r in defaults
        if not r.error
        and (r.toll_total or 0) == 0
        and any(
            k in r.route_name
            for k in ("25 de Abril", "Vasco da Gama", "Porto", "Faro", "Évora", "Setúbal")
        )
    ]
    lines.extend(
        [
            "",
            "## Precisão / gaps (automático)",
            "",
            f"- HTTP errors: "
            f"{sum(1 for r in results if r.http_status and r.http_status >= 400)}",
            f"- Rotas com toll>0 (default): "
            f"{sum(1 for r in defaults if (r.toll_total or 0) > 0)} / {len(defaults)}",
            f"- Rotas longas/pontes com toll=0 (suspeitas): "
            f"{', '.join(missing_toll_expected) or 'nenhuma listada'}",
            "- Rate limits: ver HTTP 429 nos resultados; HERE conta `return=tolls` "
            "como transacção adicional (docs).",
            "",
            "## Reconciliation futura",
            "",
            "Avaliação: **PARCIAL**",
            "",
            "- HERE devolve `route.id`, fares com `id` (válidos **só** por resposta), "
            "systems, prices, summary.tolls.total.",
            "- Falta para V1 robusta: persistir breakdown + preferência; "
            "recalcular no complete; geometry/trace real; "
            "fare ids **não** são estáveis entre requests.",
            "- Estimate → guardar snapshot € + systems → final = novo request "
            "(não reutilizar fare id).",
            "",
            "## Recomendação",
            "",
            "_Preencher após revisão humana dos valores._",
            "",
            "Candidatos:",
            "- HERE APROVADO PARA V1",
            "- HERE APROVADO COM RESERVAS",
            "- HERE REJEITADO",
            "",
            "## Como reproduzir",
            "",
            "```bash",
            "export HERE_API_KEY=...",
            "python scripts/tolls/here_tolls_spike.py --write-report",
            "```",
            "",
            "Raw JSON: `tmp/here-tolls/` (gitignored).",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="HERE Routing v8 tolls spike (PT)")
    parser.add_argument(
        "--write-report",
        action="store_true",
        help=f"Overwrite {REPORT_PATH.relative_to(REPO_ROOT)}",
    )
    parser.add_argument("--no-raw", action="store_true", help="Do not save JSON under tmp/")
    parser.add_argument(
        "--sleep",
        type=float,
        default=0.35,
        help="Pause between requests (seconds)",
    )
    args = parser.parse_args()

    api_key = (os.environ.get("HERE_API_KEY") or "").strip()
    if not api_key:
        print(
            "ERROR: HERE_API_KEY is not set. Export it and re-run.\n"
            "  PowerShell: $env:HERE_API_KEY='...'\n"
            "  bash: export HERE_API_KEY=...",
            file=sys.stderr,
        )
        return 2

    results: list[RouteTollResult] = []
    for route in ROUTES:
        r = run_one(
            route,
            api_key=api_key,
            avoid_tolls=False,
            save_raw=not args.no_raw,
        )
        print_result(r)
        results.append(r)
        time.sleep(args.sleep)
        if route.avoid_compare:
            a = run_one(
                route,
                api_key=api_key,
                avoid_tolls=True,
                save_raw=not args.no_raw,
            )
            print_result(a)
            results.append(a)
            time.sleep(args.sleep)

    # Summary table
    print("\n========== SUMMARY (default) ==========")
    print(f"{'Route':<42} {'km':>7} {'min':>5} {'toll €':>8} {'HTTP':>5}")
    for r in results:
        if r.mode != "default":
            continue
        km = f"{r.distance_m/1000:.1f}" if r.distance_m else "—"
        mn = f"{r.duration_s/60:.0f}" if r.duration_s else "—"
        tl = f"{r.toll_total:.2f}" if r.toll_total is not None else "—"
        print(f"{r.route_name:<42} {km:>7} {mn:>5} {tl:>8} {r.http_status or '—':>5}")

    ran_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    if args.write_report:
        REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
        REPORT_PATH.write_text(
            build_report_markdown(results, ran_at=ran_at),
            encoding="utf-8",
        )
        print(f"\nWrote report: {REPORT_PATH.relative_to(REPO_ROOT)}")

    # Exit non-zero if all failed
    ok = any(r.http_status == 200 and not r.error for r in results)
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
