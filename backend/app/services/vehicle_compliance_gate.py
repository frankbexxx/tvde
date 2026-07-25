"""PF3D-3A — Operational vehicle document compliance gates (feature-flagged).

Default OFF via ``settings.ENABLE_VEHICLE_COMPLIANCE_GATES``.
When OFF, all evaluate helpers return allowed=True without heavy queries.

Does **not** gate start_trip or vehicle assign.
"""

from __future__ import annotations

import uuid
from collections import defaultdict
from dataclasses import dataclass
from typing import Iterable

from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.driver import Driver
from app.schemas.partner import PartnerVehicleDocumentSummary
from app.services.partner_vehicle_documents import batch_document_summaries_for_vehicles
from app.services.vehicle_document_compliance import (
    COMPLIANCE_BLOCKED,
    COMPLIANCE_COMPLIANT,
    COMPLIANCE_NO_ACTIVE_VEHICLE,
    COMPLIANCE_UNKNOWN,
    COMPLIANCE_WARNING,
    vehicle_compliance_status,
)

# Stable gate codes (logging / HTTP detail mapping).
CODE_GATES_DISABLED = "vehicle_compliance_gates_disabled"
CODE_NO_ACTIVE_VEHICLE = "no_active_vehicle"
CODE_DOCUMENTS_BLOCKED = "vehicle_documents_blocked"
CODE_UNKNOWN = "unknown_vehicle_compliance"
CODE_WARNING = "vehicle_compliance_warning"
CODE_OK = "vehicle_compliance_ok"


@dataclass(frozen=True)
class DriverVehicleComplianceGateResult:
    allowed: bool
    code: str
    vehicle_id: str | None = None
    compliance_status: str | None = None
    blocking_reasons: tuple[str, ...] = ()
    warning_reasons: tuple[str, ...] = ()


def vehicle_compliance_gates_enabled() -> bool:
    return bool(settings.ENABLE_VEHICLE_COMPLIANCE_GATES)


def _disabled_ok() -> DriverVehicleComplianceGateResult:
    return DriverVehicleComplianceGateResult(allowed=True, code=CODE_GATES_DISABLED)


def _from_doc_result(
    *,
    vehicle_id: uuid.UUID | None,
    doc_status: str,
    blocking: tuple[str, ...],
    warning: tuple[str, ...],
) -> DriverVehicleComplianceGateResult:
    vid = str(vehicle_id) if vehicle_id else None
    if doc_status == COMPLIANCE_NO_ACTIVE_VEHICLE:
        return DriverVehicleComplianceGateResult(
            allowed=False,
            code=CODE_NO_ACTIVE_VEHICLE,
            vehicle_id=vid,
            compliance_status=doc_status,
            blocking_reasons=blocking,
            warning_reasons=warning,
        )
    if doc_status == COMPLIANCE_UNKNOWN:
        return DriverVehicleComplianceGateResult(
            allowed=False,
            code=CODE_UNKNOWN,
            vehicle_id=vid,
            compliance_status=doc_status,
            blocking_reasons=blocking,
            warning_reasons=warning,
        )
    if doc_status == COMPLIANCE_BLOCKED:
        return DriverVehicleComplianceGateResult(
            allowed=False,
            code=CODE_DOCUMENTS_BLOCKED,
            vehicle_id=vid,
            compliance_status=doc_status,
            blocking_reasons=blocking,
            warning_reasons=warning,
        )
    if doc_status == COMPLIANCE_WARNING:
        return DriverVehicleComplianceGateResult(
            allowed=True,
            code=CODE_WARNING,
            vehicle_id=vid,
            compliance_status=doc_status,
            blocking_reasons=blocking,
            warning_reasons=warning,
        )
    # compliant / other non-blocking
    return DriverVehicleComplianceGateResult(
        allowed=True,
        code=CODE_OK,
        vehicle_id=vid,
        compliance_status=doc_status or COMPLIANCE_COMPLIANT,
        blocking_reasons=blocking,
        warning_reasons=warning,
    )


def evaluate_driver_vehicle_compliance_gate(
    db: Session,
    driver: Driver,
    *,
    summary: PartnerVehicleDocumentSummary | None = None,
    summary_provided: bool = False,
) -> DriverVehicleComplianceGateResult:
    """Evaluate whether a driver may go online / receive offers / accept.

    When flag OFF → allowed immediately (no DB work).
    When ``summary_provided`` is True, ``summary`` may be None (unknown).
    When ``summary_provided`` is False and driver has active_vehicle_id, load summary.
    """
    if not vehicle_compliance_gates_enabled():
        return _disabled_ok()

    avid = driver.active_vehicle_id
    if avid is None:
        outcome = vehicle_compliance_status(None, has_active_vehicle=False)
        return _from_doc_result(
            vehicle_id=None,
            doc_status=outcome.compliance_status,
            blocking=outcome.blocking_reasons,
            warning=outcome.warning_reasons,
        )

    if not summary_provided:
        from app.services.partner_vehicle_documents import document_summary_for_vehicle

        summary = document_summary_for_vehicle(
            db,
            partner_id=driver.partner_id,
            vehicle_id=avid,
        )

    outcome = vehicle_compliance_status(summary, has_active_vehicle=True)
    return _from_doc_result(
        vehicle_id=avid,
        doc_status=outcome.compliance_status,
        blocking=outcome.blocking_reasons,
        warning=outcome.warning_reasons,
    )


def batch_evaluate_driver_vehicle_compliance_gates(
    db: Session,
    drivers: Iterable[Driver],
) -> dict[uuid.UUID, DriverVehicleComplianceGateResult]:
    """Batch evaluation for matching. Flag OFF → all allowed without queries."""
    drivers_list = list(drivers)
    if not vehicle_compliance_gates_enabled():
        return {d.user_id: _disabled_ok() for d in drivers_list}

    out: dict[uuid.UUID, DriverVehicleComplianceGateResult] = {}
    need_summary: list[Driver] = []
    for d in drivers_list:
        if d.active_vehicle_id is None:
            out[d.user_id] = evaluate_driver_vehicle_compliance_gate(
                db, d, summary=None, summary_provided=True
            )
        else:
            need_summary.append(d)

    by_partner: dict[uuid.UUID, list[uuid.UUID]] = defaultdict(list)
    for d in need_summary:
        avid = d.active_vehicle_id
        if avid is None:
            continue
        by_partner[d.partner_id].append(avid)

    summaries: dict[uuid.UUID, PartnerVehicleDocumentSummary] = {}
    for partner_id, vids in by_partner.items():
        unique = list(dict.fromkeys(vids))
        summaries.update(
            batch_document_summaries_for_vehicles(
                db,
                partner_id=partner_id,
                vehicle_ids=unique,
            )
        )

    for d in need_summary:
        avid = d.active_vehicle_id
        if avid is None:
            continue
        out[d.user_id] = evaluate_driver_vehicle_compliance_gate(
            db,
            d,
            summary=summaries.get(avid),
            summary_provided=True,
        )
    return out


def assert_driver_vehicle_compliance_for_accept(
    db: Session,
    driver: Driver,
) -> None:
    """Hard gate for accept_*; no-op when flag OFF. Raises HTTP 409 when blocked."""
    from fastapi import HTTPException, status

    result = evaluate_driver_vehicle_compliance_gate(db, driver)
    if result.allowed:
        return
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=result.code,
    )


def http_detail_for_gate(result: DriverVehicleComplianceGateResult) -> str:
    """Map gate result to HTTP detail string (same as result.code for blocked cases)."""
    return result.code
