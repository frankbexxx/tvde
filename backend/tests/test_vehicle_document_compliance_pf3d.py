"""PF3D-1: pure vehicle document compliance helper (no runtime wiring)."""

from __future__ import annotations

from app.schemas.partner import PartnerVehicleDocumentSummary
from app.services.vehicle_document_compliance import (
    COMPLIANCE_BLOCKED,
    COMPLIANCE_COMPLIANT,
    COMPLIANCE_NO_ACTIVE_VEHICLE,
    COMPLIANCE_UNKNOWN,
    COMPLIANCE_WARNING,
    REASON_EXPIRED_DOCUMENTS,
    REASON_EXPIRING_SOON,
    REASON_MISSING_DOCUMENTS,
    REASON_NO_ACTIVE_VEHICLE,
    REASON_PENDING_REVIEW,
    REASON_REJECTED_DOCUMENTS,
    vehicle_compliance_status,
    vehicle_is_compliant,
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


def test_valid_compliant() -> None:
    s = _summary(worst_status="valid", valid_count=4, present_count=4)
    r = vehicle_compliance_status(s)
    assert r.compliance_status == COMPLIANCE_COMPLIANT
    assert r.blocking_reasons == ()
    assert r.warning_reasons == ()
    assert r.worst_status == "valid"
    assert vehicle_is_compliant(s) is True
    assert vehicle_is_compliant(result=r) is True


def test_expiring_soon_warning() -> None:
    s = _summary(
        worst_status="expiring_soon",
        expiring_soon_count=1,
        valid_count=3,
        present_count=4,
    )
    r = vehicle_compliance_status(s)
    assert r.compliance_status == COMPLIANCE_WARNING
    assert r.blocking_reasons == ()
    assert r.warning_reasons == (REASON_EXPIRING_SOON,)
    assert vehicle_is_compliant(s) is True


def test_pending_review_warning() -> None:
    s = _summary(
        worst_status="pending_review",
        pending_review_count=1,
        valid_count=3,
        present_count=4,
    )
    r = vehicle_compliance_status(s)
    assert r.compliance_status == COMPLIANCE_WARNING
    assert r.blocking_reasons == ()
    assert r.warning_reasons == (REASON_PENDING_REVIEW,)
    assert vehicle_is_compliant(s) is True


def test_missing_blocked() -> None:
    s = _summary(worst_status="missing", missing_count=2, present_count=2, valid_count=2)
    r = vehicle_compliance_status(s)
    assert r.compliance_status == COMPLIANCE_BLOCKED
    assert r.blocking_reasons == (REASON_MISSING_DOCUMENTS,)
    assert vehicle_is_compliant(s) is False


def test_expired_blocked() -> None:
    s = _summary(worst_status="expired", expired_count=1, valid_count=3, present_count=4)
    r = vehicle_compliance_status(s)
    assert r.compliance_status == COMPLIANCE_BLOCKED
    assert r.blocking_reasons == (REASON_EXPIRED_DOCUMENTS,)
    assert vehicle_is_compliant(s) is False


def test_expired_pending_blocked_via_expired_count() -> None:
    # PF3C rolls expired_pending into expired_count; worst_status may be expired_pending.
    s = _summary(
        worst_status="expired_pending",
        expired_count=1,
        pending_review_count=0,
        valid_count=3,
        present_count=4,
    )
    r = vehicle_compliance_status(s)
    assert r.compliance_status == COMPLIANCE_BLOCKED
    assert r.blocking_reasons == (REASON_EXPIRED_DOCUMENTS,)
    assert vehicle_is_compliant(s) is False


def test_rejected_blocked() -> None:
    s = _summary(worst_status="rejected", rejected_count=1, valid_count=3, present_count=4)
    r = vehicle_compliance_status(s)
    assert r.compliance_status == COMPLIANCE_BLOCKED
    assert r.blocking_reasons == (REASON_REJECTED_DOCUMENTS,)
    assert vehicle_is_compliant(s) is False


def test_multiple_problems_blocked_with_all_reasons() -> None:
    s = _summary(
        worst_status="rejected",
        missing_count=1,
        expired_count=1,
        rejected_count=1,
        expiring_soon_count=1,
        pending_review_count=1,
        present_count=3,
        valid_count=0,
    )
    r = vehicle_compliance_status(s)
    assert r.compliance_status == COMPLIANCE_BLOCKED
    assert r.blocking_reasons == (
        REASON_MISSING_DOCUMENTS,
        REASON_EXPIRED_DOCUMENTS,
        REASON_REJECTED_DOCUMENTS,
    )
    assert r.warning_reasons == (REASON_EXPIRING_SOON, REASON_PENDING_REVIEW)
    assert vehicle_is_compliant(s) is False


def test_no_active_vehicle() -> None:
    s = _summary(worst_status="valid", valid_count=4, present_count=4)
    r = vehicle_compliance_status(s, has_active_vehicle=False)
    assert r.compliance_status == COMPLIANCE_NO_ACTIVE_VEHICLE
    assert r.blocking_reasons == (REASON_NO_ACTIVE_VEHICLE,)
    assert r.warning_reasons == ()
    assert r.worst_status is None
    assert vehicle_is_compliant(s, has_active_vehicle=False) is False

    r_none = vehicle_compliance_status(None, has_active_vehicle=False)
    assert r_none.compliance_status == COMPLIANCE_NO_ACTIVE_VEHICLE
    assert r_none.blocking_reasons == (REASON_NO_ACTIVE_VEHICLE,)


def test_summary_none_unknown() -> None:
    r = vehicle_compliance_status(None, has_active_vehicle=True)
    assert r.compliance_status == COMPLIANCE_UNKNOWN
    assert r.blocking_reasons == ()
    assert r.warning_reasons == ()
    assert vehicle_is_compliant(None) is False


def test_expiring_and_pending_both_warnings() -> None:
    s = _summary(
        worst_status="expiring_soon",
        expiring_soon_count=1,
        pending_review_count=1,
        valid_count=2,
        present_count=4,
    )
    r = vehicle_compliance_status(s)
    assert r.compliance_status == COMPLIANCE_WARNING
    assert r.blocking_reasons == ()
    assert r.warning_reasons == (REASON_EXPIRING_SOON, REASON_PENDING_REVIEW)
