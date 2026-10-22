"""Read-only orphan Stripe PaymentIntent detector (PR4 — R-PAY)."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import stripe
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.services.payment_anomalies import resolve_environment_label, resolve_stripe_mode
from app.services.stripe_service import list_payment_intents_page

logger = logging.getLogger(__name__)

_STRIPE_PAGE_SIZE = 100
_OPEN_STATUSES = frozenset(
    {
        "requires_confirmation",
        "requires_action",
        "requires_capture",
        "processing",
    }
)
_TERMINAL_SUCCEEDED = frozenset({"succeeded"})
_TERMINAL_CANCELED = frozenset({"canceled"})


def _orphan_class_for_status(stripe_status: str) -> str:
    s = (stripe_status or "").strip()
    if s in _OPEN_STATUSES:
        return "open"
    if s in _TERMINAL_SUCCEEDED:
        return "terminal_succeeded"
    if s in _TERMINAL_CANCELED:
        return "terminal_canceled"
    return "terminal_other"


def _parse_trip_id_from_metadata(metadata: object) -> uuid.UUID | None:
    if not isinstance(metadata, dict):
        return None
    raw = metadata.get("trip_id")
    if raw is None:
        return None
    text = str(raw).strip()
    if not text:
        return None
    try:
        return uuid.UUID(text)
    except ValueError:
        return None


def stripe_orphan_scan_skip_reason() -> tuple[str | None, str | None]:
    """
    Fail-closed eligibility for Stripe list (D2, D3, D4).
    Returns (reason_code, human_message) or (None, None) if scan may proceed.
    """
    if bool(getattr(settings, "STRIPE_MOCK", False)):
        return (
            "stripe_mock",
            "STRIPE_MOCK=true: não consulta Stripe; preview indisponível neste ambiente.",
        )
    sk = (getattr(settings, "STRIPE_SECRET_KEY", None) or "").strip()
    if not sk:
        return (
            "stripe_not_configured",
            "STRIPE_SECRET_KEY em falta; preview indisponível.",
        )
    mode = resolve_stripe_mode()
    if mode == "unknown":
        return (
            "stripe_mode_unknown",
            "Modo Stripe não identificado (prefixo de chave inválido).",
        )
    if mode == "live":
        return (
            "stripe_live_not_authorized",
            "Chave LIVE detectada: preview PR4 não autorizado (só Stripe TEST).",
        )
    if settings.is_staging_environment() and mode != "test":
        return (
            "stripe_mode_env_mismatch",
            "STAGING exige chave sk_test_; consulta bloqueada.",
        )
    if settings.is_production_environment() and mode != "live":
        return (
            "stripe_mode_env_mismatch",
            "PROD com chave não-LIVE: consulta bloqueada até go-live controlado.",
        )
    if mode != "test":
        return (
            "stripe_mode_env_mismatch",
            "Preview PR4 limitado a Stripe TEST nesta fase.",
        )
    return None, None


def _stripe_mapping_to_dict(value: object) -> dict[str, Any]:
    """Normalize Stripe metadata (dict, StripeObject.to_dict(), None)."""
    if value is None:
        return {}
    if isinstance(value, dict):
        return dict(value)
    if hasattr(value, "to_dict"):
        converted = value.to_dict()
        if isinstance(converted, dict):
            return dict(converted)
        return {}
    return {}


def _stripe_item_id(obj: object) -> str:
    if isinstance(obj, dict):
        return str(obj.get("id") or "")
    return str(getattr(obj, "id", "") or "")


def _pi_dict_from_stripe(obj: Any) -> dict[str, Any]:
    if isinstance(obj, dict):
        return {
            "id": obj.get("id"),
            "status": obj.get("status"),
            "metadata": _stripe_mapping_to_dict(obj.get("metadata")),
            "amount": obj.get("amount"),
            "currency": obj.get("currency"),
            "created": obj.get("created"),
        }
    return {
        "id": getattr(obj, "id", None),
        "status": getattr(obj, "status", None),
        "metadata": _stripe_mapping_to_dict(getattr(obj, "metadata", None)),
        "amount": getattr(obj, "amount", None),
        "currency": getattr(obj, "currency", None),
        "created": getattr(obj, "created", None),
    }


def preview_orphan_payment_intents(
    db: Session,
    *,
    window_days: int,
    grace_minutes: int,
    limit: int,
    starting_after: str | None = None,
) -> dict[str, Any]:
    scan_run_id = str(uuid.uuid4())
    scanned_at = datetime.now(timezone.utc).isoformat()
    environment = resolve_environment_label()
    stripe_mode = resolve_stripe_mode()

    window_days = max(1, min(int(window_days), 7))
    grace_minutes = max(5, min(int(grace_minutes), 60))
    list_cap = max(1, min(int(limit), 500))

    base: dict[str, Any] = {
        "scan_run_id": scan_run_id,
        "scanned_at": scanned_at,
        "scan_status": "ok",
        "skipped": False,
        "skip_reason": None,
        "skip_message": None,
        "environment": environment,
        "stripe_mode": stripe_mode,
        "window_days": window_days,
        "grace_minutes": grace_minutes,
        "stripe_list_cap": list_cap,
        "stripe_pages_fetched": 0,
        "pis_listed": 0,
        "pis_tvde_attributed": 0,
        "ignored_external_count": 0,
        "skipped_grace_count": 0,
        "linked_count": 0,
        "confirmed_orphans": [],
        "inconclusive": [],
        "errors": [],
        "has_more": False,
        "next_starting_after": None,
    }

    skip_reason, skip_message = stripe_orphan_scan_skip_reason()
    if skip_reason:
        base["skipped"] = True
        base["skip_reason"] = skip_reason
        base["skip_message"] = skip_message
        base["scan_status"] = "skipped"
        return base

    now = datetime.now(timezone.utc)
    created_lte = now - timedelta(minutes=grace_minutes)
    created_gte = now - timedelta(days=window_days)
    grace_cutoff_ts = int(created_lte.timestamp())
    created_filter = {
        "gte": int(created_gte.timestamp()),
        "lte": int(created_lte.timestamp()),
    }

    collected: list[dict[str, Any]] = []
    cursor = (starting_after or "").strip() or None
    pages = 0
    stripe_has_more = False
    last_id: str | None = None

    try:
        while len(collected) < list_cap:
            page_limit = min(_STRIPE_PAGE_SIZE, list_cap - len(collected))
            page = list_payment_intents_page(
                created=created_filter,
                limit=page_limit,
                starting_after=cursor,
            )
            pages += 1
            data = page.get("data") or []
            for item in data:
                collected.append(_pi_dict_from_stripe(item))
                last_id = _stripe_item_id(item) or None
            if page.get("has_more"):
                if data:
                    cursor = _stripe_item_id(data[-1]) or None
                stripe_has_more = True
                if len(collected) >= list_cap:
                    break
            else:
                stripe_has_more = False
                break
    except stripe.error.RateLimitError as exc:
        logger.warning("orphan_pi_scan rate_limit", exc_info=True)
        base["scan_status"] = "failed"
        base["errors"].append("stripe_rate_limit")
        base["errors"].append(str(getattr(exc, "user_message", None) or exc)[:200])
        base["stripe_pages_fetched"] = pages
        base["pis_listed"] = len(collected)
        return base
    except stripe.error.APIConnectionError as exc:
        logger.warning("orphan_pi_scan connection_error", exc_info=True)
        base["scan_status"] = "failed"
        base["errors"].append("stripe_connection_error")
        base["errors"].append(str(exc)[:200])
        base["stripe_pages_fetched"] = pages
        base["pis_listed"] = len(collected)
        return base
    except stripe.error.StripeError as exc:
        logger.warning("orphan_pi_scan stripe_error", exc_info=True)
        base["scan_status"] = "failed"
        base["errors"].append("stripe_error")
        base["errors"].append(str(exc.user_message or exc)[:200])
        base["stripe_pages_fetched"] = pages
        base["pis_listed"] = len(collected)
        return base

    base["stripe_pages_fetched"] = pages
    base["pis_listed"] = len(collected)

    if stripe_has_more and len(collected) >= list_cap:
        base["has_more"] = True
        base["next_starting_after"] = cursor or last_id
        base["scan_status"] = "partial"

    pi_ids = [str(p["id"]) for p in collected if p.get("id")]
    trip_ids: list[uuid.UUID] = []
    invalid_metadata: list[tuple[str, str]] = []
    external_ids: list[str] = []
    grace_ids: list[str] = []
    tvde_candidates: list[dict[str, Any]] = []

    for p in collected:
        pi_id = str(p.get("id") or "")
        if not pi_id:
            continue
        created_ts = p.get("created")
        if isinstance(created_ts, int) and created_ts > grace_cutoff_ts:
            grace_ids.append(pi_id)
            continue
        trip_uuid = _parse_trip_id_from_metadata(p.get("metadata"))
        if trip_uuid is None:
            meta = p.get("metadata") if isinstance(p.get("metadata"), dict) else {}
            if meta.get("trip_id") not in (None, ""):
                invalid_metadata.append((pi_id, str(meta.get("trip_id"))[:64]))
            else:
                external_ids.append(pi_id)
            continue
        trip_ids.append(trip_uuid)
        tvde_candidates.append({**p, "_trip_uuid": trip_uuid})

    base["ignored_external_count"] = len(external_ids)
    base["skipped_grace_count"] = len(grace_ids)
    base["pis_tvde_attributed"] = len(tvde_candidates)

    for pi_id, raw_tid in invalid_metadata:
        base["inconclusive"].append(
            {
                "payment_intent_id": pi_id,
                "finding_kind": "inconclusive_invalid_trip_id",
                "detail": f"metadata.trip_id inválido: {raw_tid!r}",
                "trip_id_metadata": raw_tid,
                "stripe_status": None,
            }
        )

    if not pi_ids:
        return base

    payments_by_pi = {
        row.stripe_payment_intent_id: row
        for row in db.execute(
            select(Payment).where(Payment.stripe_payment_intent_id.in_(pi_ids))
        )
        .scalars()
        .all()
        if row.stripe_payment_intent_id
    }

    unique_trip_ids = list({t for t in trip_ids})
    trips_by_id: dict[uuid.UUID, Trip] = {}
    if unique_trip_ids:
        for trip in db.execute(select(Trip).where(Trip.id.in_(unique_trip_ids))).scalars():
            trips_by_id[trip.id] = trip

    payments_by_trip: dict[uuid.UUID, Payment] = {}
    if unique_trip_ids:
        for pay in db.execute(
            select(Payment).where(Payment.trip_id.in_(unique_trip_ids))
        ).scalars():
            payments_by_trip[pay.trip_id] = pay

    for p in tvde_candidates:
        pi_id = str(p.get("id") or "")
        trip_uuid: uuid.UUID = p["_trip_uuid"]
        trip_id_str = str(trip_uuid)
        stripe_status = str(p.get("status") or "")

        if pi_id in payments_by_pi:
            base["linked_count"] += 1
            continue

        if trip_uuid not in trips_by_id:
            base["inconclusive"].append(
                {
                    "payment_intent_id": pi_id,
                    "finding_kind": "inconclusive_trip_not_found",
                    "detail": "metadata.trip_id válido mas viagem inexistente na BD",
                    "trip_id_metadata": trip_id_str,
                    "stripe_status": stripe_status,
                }
            )
            continue

        trip_payment = payments_by_trip.get(trip_uuid)
        if trip_payment is not None:
            other_pi = (trip_payment.stripe_payment_intent_id or "").strip()
            if other_pi and other_pi != pi_id:
                base["inconclusive"].append(
                    {
                        "payment_intent_id": pi_id,
                        "finding_kind": "inconclusive_trip_has_other_payment",
                        "detail": f"Viagem já tem Payment com outro PI ({other_pi})",
                        "trip_id_metadata": trip_id_str,
                        "stripe_status": stripe_status,
                    }
                )
                continue

        base["confirmed_orphans"].append(
            {
                "payment_intent_id": pi_id,
                "stripe_status": stripe_status,
                "orphan_class": _orphan_class_for_status(stripe_status),
                "finding_kind": "confirmed_orphan",
                "trip_id_metadata": trip_id_str,
                "trip_exists": True,
                "amount_cents": p.get("amount"),
                "currency": (str(p.get("currency") or "")).lower() or None,
                "stripe_created": p.get("created"),
                "payment_row_found": False,
            }
        )

    return base
