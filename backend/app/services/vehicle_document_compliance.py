"""PF3D-1 — Pure vehicle document compliance helper (no runtime gates).

Consumes PF3C ``PartnerVehicleDocumentSummary`` (or compatible counts).
Does **not** wire into matching, accept, go_online, reassign, or start_trip.

Provisional product rules (PF3D-0 A–E):
- ``expiring_soon`` / ``pending_review`` → warning (not blocked)
- ``missing`` / ``expired`` / ``expired_pending`` / ``rejected`` → blocked
- no ``active_vehicle_id`` → ``no_active_vehicle`` (blocked for future gates)
- ``summary is None`` with an active vehicle context → ``unknown``
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

# --- status strings ---
COMPLIANCE_COMPLIANT = "compliant"
COMPLIANCE_WARNING = "warning"
COMPLIANCE_BLOCKED = "blocked"
COMPLIANCE_NO_ACTIVE_VEHICLE = "no_active_vehicle"
COMPLIANCE_UNKNOWN = "unknown"

COMPLIANCE_STATUSES: frozenset[str] = frozenset(
    {
        COMPLIANCE_COMPLIANT,
        COMPLIANCE_WARNING,
        COMPLIANCE_BLOCKED,
        COMPLIANCE_NO_ACTIVE_VEHICLE,
        COMPLIANCE_UNKNOWN,
    }
)

# --- blocking reason strings ---
REASON_MISSING_DOCUMENTS = "missing_documents"
REASON_EXPIRED_DOCUMENTS = "expired_documents"
REASON_REJECTED_DOCUMENTS = "rejected_documents"
REASON_NO_ACTIVE_VEHICLE = "no_active_vehicle"

# --- warning reason strings ---
REASON_EXPIRING_SOON = "expiring_soon"
REASON_PENDING_REVIEW = "pending_review"

_BLOCKING_REASON_ORDER: tuple[str, ...] = (
    REASON_MISSING_DOCUMENTS,
    REASON_EXPIRED_DOCUMENTS,
    REASON_REJECTED_DOCUMENTS,
    REASON_NO_ACTIVE_VEHICLE,
)
_WARNING_REASON_ORDER: tuple[str, ...] = (
    REASON_EXPIRING_SOON,
    REASON_PENDING_REVIEW,
)


class VehicleDocumentSummaryLike(Protocol):
    """Minimal shape of PF3C ``PartnerVehicleDocumentSummary``."""

    missing_count: int
    expired_count: int
    expiring_soon_count: int
    pending_review_count: int
    rejected_count: int
    worst_status: str


@dataclass(frozen=True)
class VehicleDocumentComplianceResult:
    """Outcome of pure compliance evaluation (no side effects)."""

    compliance_status: str
    blocking_reasons: tuple[str, ...]
    warning_reasons: tuple[str, ...]
    worst_status: str | None = None


def _ordered(reasons: set[str], order: tuple[str, ...]) -> tuple[str, ...]:
    return tuple(r for r in order if r in reasons)


def vehicle_compliance_status(
    summary: VehicleDocumentSummaryLike | None,
    *,
    has_active_vehicle: bool = True,
) -> VehicleDocumentComplianceResult:
    """Derive compliance from a document summary and active-vehicle flag.

    Parameters
    ----------
    summary:
        PF3C aggregate, or ``None`` when data is unavailable.
    has_active_vehicle:
        ``False`` when the driver/context has no ``active_vehicle_id``.
        When ``False``, document counts are ignored and status is
        ``no_active_vehicle`` (future gates will treat this as blocked).

    Notes
    -----
    - ``summary is None`` and ``has_active_vehicle=True`` → ``unknown``
      (insufficient data; not assumed blocked).
    - ``expired_count`` covers both ``expired`` and ``expired_pending`` slots
      (PF3C summary aggregation).
    """
    if not has_active_vehicle:
        return VehicleDocumentComplianceResult(
            compliance_status=COMPLIANCE_NO_ACTIVE_VEHICLE,
            blocking_reasons=(REASON_NO_ACTIVE_VEHICLE,),
            warning_reasons=(),
            worst_status=None,
        )

    if summary is None:
        return VehicleDocumentComplianceResult(
            compliance_status=COMPLIANCE_UNKNOWN,
            blocking_reasons=(),
            warning_reasons=(),
            worst_status=None,
        )

    blocking: set[str] = set()
    warnings: set[str] = set()

    if summary.missing_count > 0:
        blocking.add(REASON_MISSING_DOCUMENTS)
    if summary.expired_count > 0:
        blocking.add(REASON_EXPIRED_DOCUMENTS)
    if summary.rejected_count > 0:
        blocking.add(REASON_REJECTED_DOCUMENTS)
    if summary.expiring_soon_count > 0:
        warnings.add(REASON_EXPIRING_SOON)
    if summary.pending_review_count > 0:
        warnings.add(REASON_PENDING_REVIEW)

    blocking_reasons = _ordered(blocking, _BLOCKING_REASON_ORDER)
    warning_reasons = _ordered(warnings, _WARNING_REASON_ORDER)
    worst = (summary.worst_status or "").strip() or None

    if blocking_reasons:
        status = COMPLIANCE_BLOCKED
    elif warning_reasons:
        status = COMPLIANCE_WARNING
    else:
        status = COMPLIANCE_COMPLIANT

    return VehicleDocumentComplianceResult(
        compliance_status=status,
        blocking_reasons=blocking_reasons,
        warning_reasons=warning_reasons,
        worst_status=worst,
    )


def vehicle_is_compliant(
    summary: VehicleDocumentSummaryLike | None = None,
    *,
    has_active_vehicle: bool = True,
    result: VehicleDocumentComplianceResult | None = None,
) -> bool:
    """True when future gates (under PF3D A–E) would allow operation.

    ``compliant`` and ``warning`` → True.
    ``blocked``, ``no_active_vehicle``, ``unknown`` → False.
    """
    outcome = result or vehicle_compliance_status(
        summary,
        has_active_vehicle=has_active_vehicle,
    )
    return outcome.compliance_status in (COMPLIANCE_COMPLIANT, COMPLIANCE_WARNING)
