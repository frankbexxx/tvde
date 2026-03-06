"""Admin metrics — counts for dashboard. Read-only."""

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models.driver import Driver
from app.db.models.trip import Trip
from app.models.enums import TripStatus


def get_admin_metrics(db: Session) -> dict:
    """Return basic operational metrics for admin dashboard."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    active_statuses = (TripStatus.accepted, TripStatus.arriving, TripStatus.ongoing)
    active_trips = db.execute(
        select(func.count()).select_from(Trip).where(Trip.status.in_(active_statuses))
    ).scalar() or 0

    drivers_available = db.execute(
        select(func.count()).select_from(Driver).where(Driver.is_available.is_(True))
    ).scalar() or 0

    drivers_busy = db.execute(
        select(func.count()).select_from(Driver).where(Driver.is_available.is_(False))
    ).scalar() or 0

    trips_requested = db.execute(
        select(func.count()).select_from(Trip).where(Trip.status == TripStatus.requested)
    ).scalar() or 0

    trips_ongoing = db.execute(
        select(func.count()).select_from(Trip).where(Trip.status == TripStatus.ongoing)
    ).scalar() or 0

    trips_completed_today = db.execute(
        select(func.count()).select_from(Trip).where(
            Trip.status == TripStatus.completed,
            Trip.completed_at >= today_start,
        )
    ).scalar() or 0

    return {
        "active_trips": active_trips,
        "drivers_available": drivers_available,
        "drivers_busy": drivers_busy,
        "trips_requested": trips_requested,
        "trips_ongoing": trips_ongoing,
        "trips_completed_today": trips_completed_today,
    }
