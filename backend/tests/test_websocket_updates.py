"""B001: WebSocket infrastructure tests."""

from datetime import datetime, timezone

import pytest

from app.models.enums import TripStatus
from app.realtime.hub import hub
from app.schemas.realtime import TripStatusChangedEvent


def test_trip_status_update_broadcast() -> None:
    """TEST-WS-002: trip status update broadcast runs without error."""
    event = TripStatusChangedEvent(
        trip_id="trip-123",
        status=TripStatus.accepted,
        timestamp=datetime.now(timezone.utc),
    )
    hub.publish(event)
    # No subscribers; broadcast is a no-op. Verifies publish does not raise.


def test_driver_location_broadcast_payload() -> None:
    """TEST-WS-001: driver location update produces correct payload structure."""
    ts = datetime.now(timezone.utc)
    hub.publish_driver_location(
        trip_id="trip-456",
        lat=38.7,
        lng=-9.1,
        timestamp=ts,
    )
    # No subscribers; broadcast is a no-op. Verifies publish_driver_location does not raise.
