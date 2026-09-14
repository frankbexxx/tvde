"""PORTAGENS V1 — F1 toll snapshot helpers (create estimate → price_breakdown)."""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from app.services.tolls.here import TollEstimateResult

# Keys persisted beside fare fields in Trip.price_breakdown (JSONB). No migration.
TOLL_SNAPSHOT_KEYS: tuple[str, ...] = (
    "estimated_tolls_amount",
    "charged_tolls_amount",
    "tolls_source",
    "tolls_status",
    "tolls_calculated_at",
    "tolls_systems",
    "tolls_fares",
    "tolls_http_status",
    "tolls_latency_ms",
    "tolls_error_code",
)


def charged_amount_from_estimate(result: TollEstimateResult) -> Decimal:
    """F1: charge only what was estimated; errors/flag_off/no_tolls → 0."""
    if result.status in ("ok", "no_tolls") and result.amount > 0:
        return result.amount
    return Decimal("0.00")


def snapshot_status_for_create(result: TollEstimateResult) -> str:
    """Map client status to persisted tolls_status (create failure → zero_fallback)."""
    if result.status == "error":
        return "zero_fallback"
    return result.status


def build_create_toll_snapshot(result: TollEstimateResult) -> dict[str, Any]:
    """Sanitized audit snapshot — never includes API key or raw HERE payload."""
    charged = charged_amount_from_estimate(result)
    # Persist estimated as charged for ok/no_tolls; 0 on error/flag_off.
    if result.status == "ok":
        estimated = result.amount
    elif result.status == "no_tolls":
        estimated = Decimal("0.00")
    else:
        estimated = Decimal("0.00")

    fares: list[dict[str, Any]] = []
    for f in result.fares:
        fares.append(
            {
                "name": f.name,
                "currency": f.currency,
                "value": f.value,
                "toll_system": f.toll_system,
                "payment_methods": list(f.payment_methods),
                # fare_id intentionally omitted (unstable across requests)
            }
        )

    return {
        "estimated_tolls_amount": float(estimated),
        "charged_tolls_amount": float(charged),
        "tolls_source": result.source,
        "tolls_status": snapshot_status_for_create(result),
        "tolls_calculated_at": result.calculated_at.isoformat(),
        "tolls_systems": list(result.systems),
        "tolls_fares": fares,
        "tolls_http_status": result.http_status,
        "tolls_latency_ms": result.latency_ms,
        "tolls_error_code": result.error_code,
    }


def merge_toll_snapshot(
    breakdown_dict: dict[str, Any],
    *,
    prior: dict[str, Any] | None = None,
    toll_meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Merge fare breakdown with toll meta; preserve prior snapshot keys if needed."""
    out = dict(breakdown_dict)
    if prior:
        for key in TOLL_SNAPSHOT_KEYS:
            if key in prior and key not in out:
                out[key] = prior[key]
    if toll_meta:
        out.update(toll_meta)
    return out


__all__ = [
    "TOLL_SNAPSHOT_KEYS",
    "build_create_toll_snapshot",
    "charged_amount_from_estimate",
    "merge_toll_snapshot",
    "snapshot_status_for_create",
]
