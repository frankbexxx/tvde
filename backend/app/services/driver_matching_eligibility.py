"""Whether this driver can enter the pool for a new offer.

``matching_eligible`` is admission to that pool, not a guarantee that a
particular trip will create an offer. Radius, fare, capacity, self-passenger
and top-N stay in dispatch.

Driving hours are outside this snapshot. Dispatch does not consult them
either, and this module does not change that gate. Accept and go-online can
still answer ``driving_hours_blocked`` while ``matching_eligible`` is true.

The read does not change Online/Offline and does not cancel an active trip.
Freshness uses ``location_is_fresh_for_matching`` (same 45-second window).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.driver import Driver, DriverLocation
from app.models.enums import DriverStatus
from app.services.driver_documents import (
    DRIVER_DOCUMENTS_INCOMPLETE,
    driver_required_documents_approved,
)
from app.services.location_freshness import (
    location_age_seconds,
    location_is_fresh_for_matching,
)
from app.services.vehicle_compliance_gate import evaluate_driver_vehicle_compliance_gate
from app.services.vehicle_operational import (
    CODE_VEHICLE_INACTIVE,
    evaluate_driver_vehicle_operational,
)

REASON_DRIVER_NOT_APPROVED = "driver_not_approved"
REASON_OFFLINE = "offline"
REASON_LOCATION_MISSING = "location_missing"
REASON_LOCATION_STALE = "location_stale"


@dataclass(frozen=True)
class DriverMatchingEligibility:
    matching_eligible: bool
    gps_fix_age_seconds: float | None
    location_stale_for_matching: bool
    matching_ineligible_reason: str | None


def evaluate_driver_matching_eligibility(
    db: Session,
    driver: Driver,
    *,
    now: datetime | None = None,
) -> DriverMatchingEligibility:
    """Read-only snapshot. Does not change availability or any trip."""
    now_utc = now or datetime.now(timezone.utc)
    loc = db.execute(
        select(DriverLocation).where(DriverLocation.driver_id == driver.user_id)
    ).scalar_one_or_none()

    age: float | None = None
    stale = False
    if loc is not None:
        age = location_age_seconds(loc.timestamp, now=now_utc)
        stale = not location_is_fresh_for_matching(loc.timestamp, now=now_utc)

    reason: str | None = None
    if driver.status != DriverStatus.approved:
        reason = REASON_DRIVER_NOT_APPROVED
    elif not driver.is_available:
        reason = REASON_OFFLINE
    elif loc is None:
        reason = REASON_LOCATION_MISSING
    elif stale:
        reason = REASON_LOCATION_STALE
    else:
        op_ok, op_code, _op_vid = evaluate_driver_vehicle_operational(db, driver)
        if not op_ok:
            reason = op_code or CODE_VEHICLE_INACTIVE
        else:
            gate = evaluate_driver_vehicle_compliance_gate(db, driver)
            if not gate.allowed:
                reason = gate.code
            elif not driver_required_documents_approved(driver):
                reason = DRIVER_DOCUMENTS_INCOMPLETE

    return DriverMatchingEligibility(
        matching_eligible=reason is None,
        gps_fix_age_seconds=age,
        location_stale_for_matching=stale,
        matching_ineligible_reason=reason,
    )
