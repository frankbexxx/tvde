"""M2 activity retention — stamp historical partner/vehicle on trips.

Minimum retention target: 730 days (aligned with AUDIT_EVENTS_RETENTION_DAYS).
No purge of trips/segments is implemented here — only preservation.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.db.models.driver import Driver
from app.db.models.trip import Trip
from app.db.models.vehicle import Vehicle

# Provisional M2 floor (same horizon as AuditEvent hotfix). Not a purge job.
ACTIVITY_RETENTION_DAYS = 730


def stamp_trip_activity_context(
    db: Session,
    trip: Trip,
    driver: Driver,
) -> None:
    """
    Snapshot partner + active vehicle onto the trip at assignment/accept time.

    Overwrites prior historical fields when the trip is reassigned (partner
    reassign / new accept) so the trip reflects the *serving* context.
    Does not invent a vehicle if the driver has none assigned.
    """
    trip.partner_id = driver.partner_id
    vehicle: Vehicle | None = None
    avid = driver.active_vehicle_id
    if avid is not None:
        vehicle = db.get(Vehicle, avid)
    if vehicle is None:
        trip.vehicle_id = None
        trip.vehicle_plate = None
        return
    trip.vehicle_id = vehicle.id
    # Prefer display plate; empty → normalized (should not happen for valid rows).
    plate = (vehicle.plate or "").strip() or (vehicle.plate_normalized or "").strip()
    trip.vehicle_plate = plate[:32] if plate else None


def clear_trip_activity_context(trip: Trip) -> None:
    """Clear historical stamps when driver is unassigned (timeouts / cancel paths)."""
    trip.partner_id = None
    trip.vehicle_id = None
    trip.vehicle_plate = None
