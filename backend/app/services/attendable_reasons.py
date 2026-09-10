"""PET-5A.2 — structured attendable reasons (animal / assistance dog).

Canonical codes are backend source of truth. Labels for passenger-facing
surfaces are controlled (never expose driver free text).
"""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status

ATTENDABLE_REASON_CODES = frozenset(
    {
        "animal_safety_risk",
        "animal_hygiene_issue",
        "animal_health_concern",
        "inadequate_accommodation",
        "other_attendable_reason",
    }
)

OTHER_ATTENDABLE_REASON = "other_attendable_reason"
MAX_REASON_DETAIL_LEN = 280

# Passenger-safe PT labels (API fallback when FE does not map code).
PASSENGER_SAFE_LABELS_PT: dict[str, str] = {
    "animal_safety_risk": "Risco para a segurança",
    "animal_hygiene_issue": "Problema de higiene",
    "animal_health_concern": "Problema de saúde do animal",
    "inadequate_accommodation": "Acondicionamento inadequado",
    "other_attendable_reason": "Outro motivo atendível",
}


def trip_involves_animal(trip: Any) -> bool:
    """True for commercial pet, assistance dog, or legacy vehicle_category=pet."""
    if bool(getattr(trip, "is_assistance_animal", False)):
        return True
    if bool(getattr(trip, "has_pet", False)):
        return True
    cat = (getattr(trip, "vehicle_category", None) or "").strip().lower()
    return cat == "pet"


def passenger_safe_label(code: str | None) -> str | None:
    if not code:
        return None
    return PASSENGER_SAFE_LABELS_PT.get(code)


def normalize_reason_detail(detail: str | None) -> str | None:
    if detail is None:
        return None
    cleaned = detail.strip()
    if not cleaned:
        return None
    return cleaned[:MAX_REASON_DETAIL_LEN]


def validate_attendable_reason(
    *,
    reason_code: str | None,
    reason_detail: str | None,
    required: bool,
) -> tuple[str | None, str | None]:
    """Validate structured attendable reason.

    Returns ``(code, detail)``. Raises HTTPException 422 on invalid input.
    When ``required`` is False and both empty → ``(None, None)``.
    """
    code = (reason_code or "").strip() or None
    detail = normalize_reason_detail(reason_detail)

    if not required and code is None and detail is None:
        return None, None

    if code is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="attendable_reason_code_required",
        )
    if code not in ATTENDABLE_REASON_CODES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="attendable_reason_code_invalid",
        )
    if code == OTHER_ATTENDABLE_REASON and detail is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="attendable_reason_detail_required",
        )
    if detail is not None and len(detail) > MAX_REASON_DETAIL_LEN:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="attendable_reason_detail_too_long",
        )
    # Non-other codes: detail optional (audit). Whitespace-only already cleared.
    return code, detail
