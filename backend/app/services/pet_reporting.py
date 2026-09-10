"""PET-5B — shared helpers for Partner/Admin pet/capacity reporting."""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.trip_offer import TripOffer
from app.models.enums import OfferStatus
from app.schemas.trip import PriceBreakdownSchema
from app.services.attendable_reasons import passenger_safe_label


def pet_surcharge_amount(trip: Any) -> float | None:
    snap = getattr(trip, "pet_surcharge_amount", None)
    if snap is None:
        return None
    return float(snap)


def price_breakdown_schema(trip: Any) -> PriceBreakdownSchema | None:
    raw = getattr(trip, "price_breakdown", None)
    if not isinstance(raw, dict):
        return None
    try:
        return PriceBreakdownSchema.model_validate(raw)
    except Exception:
        return None


def vehicle_plate(trip: Any) -> str | None:
    vehicle = getattr(trip, "vehicle", None)
    if vehicle is None:
        return None
    plate = getattr(vehicle, "plate", None)
    return str(plate) if plate else None


def offer_rejection_rows(db: Session, trip_id: Any) -> list[dict[str, Any]]:
    """Rejected offers with structured reasons (PET-5A.2), newest first."""
    rows = list(
        db.execute(
            select(TripOffer)
            .where(
                TripOffer.trip_id == trip_id,
                TripOffer.status == OfferStatus.rejected,
            )
            .order_by(TripOffer.updated_at.desc())
            .limit(20)
        )
        .scalars()
        .all()
    )
    out: list[dict[str, Any]] = []
    for offer in rows:
        code = getattr(offer, "rejection_reason_code", None)
        detail = getattr(offer, "rejection_reason_detail", None)
        out.append(
            {
                "offer_id": str(offer.id),
                "driver_id": str(offer.driver_id),
                "reason_code": code,
                "reason_label": passenger_safe_label(code) if code else None,
                "reason_detail": (detail or "").strip() or None,
                "rejected_at": offer.updated_at.isoformat() if offer.updated_at else None,
            }
        )
    return out
