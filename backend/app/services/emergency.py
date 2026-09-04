"""M2-L4 Emergency / SOS foundation.

Authenticated snapshot + explicit-action audits. No public share URLs, no PSAP.
Strict ownership — no BETA bypass.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db.models.audit_event import AuditEvent
from app.db.models.driver import Driver, DriverLocation
from app.db.models.trip import Trip
from app.db.models.user import User
from app.models.enums import Role, TripStatus
from app.schemas.emergency import (
    EmergencyEventAction,
    EmergencyLocationSnapshot,
    EmergencySnapshotResponse,
)

PASSENGER_ELIGIBLE = frozenset(
    {
        TripStatus.assigned,
        TripStatus.accepted,
        TripStatus.arriving,
        TripStatus.ongoing,
    }
)
DRIVER_ELIGIBLE = frozenset(
    {
        TripStatus.accepted,
        TripStatus.arriving,
        TripStatus.ongoing,
    }
)


def public_trip_ref(trip_id: uuid.UUID | str) -> str:
    """Short public reference — not a full internal UUID."""
    raw = str(trip_id).replace("-", "").upper()
    return f"VM-{raw[-8:]}"


def maps_link(lat: float, lng: float) -> str:
    return f"https://maps.google.com/?q={lat:.6f},{lng:.6f}"


def _parse_trip_id(trip_id: str) -> uuid.UUID:
    try:
        return uuid.UUID(str(trip_id).strip())
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="trip_not_found",
        ) from exc


def get_emergency_snapshot(
    db: Session,
    *,
    user_id: str,
    role: Role,
    trip_id: str,
) -> EmergencySnapshotResponse:
    """Return a safe emergency snapshot for the caller's own eligible trip."""
    if role not in (Role.passenger, Role.driver):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="forbidden_role",
        )

    trip_uuid = _parse_trip_id(trip_id)
    trip = db.execute(select(Trip).where(Trip.id == trip_uuid)).scalar_one_or_none()
    if trip is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="trip_not_found",
        )

    uid = str(user_id)
    if role == Role.passenger:
        if str(trip.passenger_id) != uid:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="forbidden_trip_access",
            )
        if trip.status not in PASSENGER_ELIGIBLE:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="trip_not_eligible_for_emergency",
            )
    else:
        if not trip.driver_id or str(trip.driver_id) != uid:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="forbidden_trip_access",
            )
        if trip.status not in DRIVER_ELIGIBLE:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="trip_not_eligible_for_emergency",
            )

    vehicle_plate: str | None = None
    driver_display_name: str | None = None
    location: EmergencyLocationSnapshot | None = None

    if trip.driver_id is not None:
        driver = db.execute(
            select(Driver)
            .options(joinedload(Driver.active_vehicle))
            .where(Driver.user_id == trip.driver_id)
        ).scalar_one_or_none()
        if driver and driver.active_vehicle is not None:
            vehicle_plate = driver.active_vehicle.plate

        if role == Role.passenger:
            driver_user = db.execute(
                select(User).where(User.id == trip.driver_id)
            ).scalar_one_or_none()
            if driver_user and (driver_user.name or "").strip():
                driver_display_name = driver_user.name.strip()

        loc = db.execute(
            select(DriverLocation).where(DriverLocation.driver_id == trip.driver_id)
        ).scalar_one_or_none()
        if loc is not None:
            ts = loc.timestamp
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            else:
                ts = ts.astimezone(timezone.utc)
            lat = float(loc.lat)
            lng = float(loc.lng)
            location = EmergencyLocationSnapshot(
                lat=lat,
                lng=lng,
                updated_at=ts.isoformat(),
                map_link=maps_link(lat, lng),
            )

    return EmergencySnapshotResponse(
        trip_ref=public_trip_ref(trip.id),
        status=trip.status.value,
        origin_lat=float(trip.origin_lat),
        origin_lng=float(trip.origin_lng),
        destination_lat=float(trip.destination_lat),
        destination_lng=float(trip.destination_lng),
        vehicle_plate=vehicle_plate,
        driver_display_name=driver_display_name if role == Role.passenger else None,
        location=location,
        role_view=role.value,
    )


def record_emergency_event(
    db: Session,
    *,
    user_id: str,
    role: Role,
    trip_id: str,
    action: EmergencyEventAction,
) -> bool:
    """
    Persist AuditEvent for an explicit user emergency action.

    Validates ownership/eligibility like the snapshot (no BETA bypass).
    Returns True if recorded. Caller may ignore failures for call/share UX.
    """
    # Reuse snapshot validation (raises on failure).
    snap = get_emergency_snapshot(db, user_id=user_id, role=role, trip_id=trip_id)

    event_type = {
        EmergencyEventAction.opened: "emergency.opened",
        EmergencyEventAction.call_initiated: "emergency.call_initiated",
        EmergencyEventAction.shared: "emergency.shared",
    }[action]

    payload = {
        "actor_user_id": str(user_id),
        "role": role.value,
        "trip_ref": snap.trip_ref,
        "trip_status": snap.status,
        "action": action.value,
        # No lat/lng in payload — location existence only.
        "had_location": snap.location is not None,
    }
    db.add(
        AuditEvent(
            event_type=event_type,
            entity_type="trip",
            entity_id=str(_parse_trip_id(trip_id))[:64],
            payload=payload,
            occurred_at=datetime.now(timezone.utc),
        )
    )
    db.commit()
    return True
