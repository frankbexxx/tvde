"""PF3D-2: read-only vehicle_compliance on PartnerVehicleItem (no runtime gates)."""

from __future__ import annotations

from app.schemas.partner import PartnerVehicleDocumentSummary
from app.services.partner_vehicles import vehicle_compliance_for_summary
from app.services.vehicle_document_compliance import (
    COMPLIANCE_BLOCKED,
    COMPLIANCE_COMPLIANT,
    COMPLIANCE_UNKNOWN,
    COMPLIANCE_WARNING,
    REASON_EXPIRED_DOCUMENTS,
    REASON_EXPIRING_SOON,
    REASON_MISSING_DOCUMENTS,
    REASON_PENDING_REVIEW,
)


def _summary(
    *,
    worst_status: str,
    missing_count: int = 0,
    expired_count: int = 0,
    expiring_soon_count: int = 0,
    pending_review_count: int = 0,
    rejected_count: int = 0,
    valid_count: int = 0,
    present_count: int | None = None,
    total_required: int = 4,
) -> PartnerVehicleDocumentSummary:
    present = present_count if present_count is not None else total_required - missing_count
    return PartnerVehicleDocumentSummary(
        total_required=total_required,
        present_count=present,
        missing_count=missing_count,
        expired_count=expired_count,
        expiring_soon_count=expiring_soon_count,
        pending_review_count=pending_review_count,
        rejected_count=rejected_count,
        valid_count=valid_count,
        worst_status=worst_status,
    )


def test_valid_summary_compliant() -> None:
    s = _summary(worst_status="valid", valid_count=4, present_count=4)
    c = vehicle_compliance_for_summary(s)
    assert c.compliance_status == COMPLIANCE_COMPLIANT
    assert c.blocking_reasons == []
    assert c.warning_reasons == []
    assert c.worst_status == "valid"


def test_missing_docs_blocked() -> None:
    s = _summary(worst_status="missing", missing_count=2, present_count=2, valid_count=2)
    c = vehicle_compliance_for_summary(s)
    assert c.compliance_status == COMPLIANCE_BLOCKED
    assert c.blocking_reasons == [REASON_MISSING_DOCUMENTS]
    assert REASON_MISSING_DOCUMENTS in c.blocking_reasons


def test_expired_blocked() -> None:
    s = _summary(worst_status="expired", expired_count=1, valid_count=3, present_count=4)
    c = vehicle_compliance_for_summary(s)
    assert c.compliance_status == COMPLIANCE_BLOCKED
    assert c.blocking_reasons == [REASON_EXPIRED_DOCUMENTS]


def test_expiring_and_pending_warning() -> None:
    s = _summary(
        worst_status="expiring_soon",
        expiring_soon_count=1,
        pending_review_count=1,
        valid_count=2,
        present_count=4,
    )
    c = vehicle_compliance_for_summary(s)
    assert c.compliance_status == COMPLIANCE_WARNING
    assert c.blocking_reasons == []
    assert c.warning_reasons == [REASON_EXPIRING_SOON, REASON_PENDING_REVIEW]


def test_summary_none_unknown() -> None:
    c = vehicle_compliance_for_summary(None)
    assert c.compliance_status == COMPLIANCE_UNKNOWN
    assert c.blocking_reasons == []
    assert c.warning_reasons == []
    assert c.worst_status is None


def test_vehicle_item_never_uses_no_active_vehicle_for_docs() -> None:
    """Unassigned vehicles still get document compliance, not no_active_vehicle."""
    s = _summary(worst_status="missing", missing_count=4, present_count=0)
    c = vehicle_compliance_for_summary(s)
    assert c.compliance_status == COMPLIANCE_BLOCKED
    assert "no_active_vehicle" not in c.blocking_reasons
    assert c.compliance_status != "no_active_vehicle"
