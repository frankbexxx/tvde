"""B001: WebSocket infrastructure tests."""

import asyncio
from datetime import datetime, timezone


from app.models.enums import TripStatus
from app.realtime.driver_offers_hub import driver_offers_hub
from app.realtime.hub import hub
from app.schemas.realtime import TripStatusChangedEvent


async def _test_client_receives_trip_status() -> None:
    """TEST-WS-002: client receives trip status change."""
    received: list[dict] = []

    class MockWS:
        async def send_json(self, data: dict) -> None:
            received.append(data)

    mock_ws = MockWS()
    trip_id = "trip-ws-test-002"
    async with hub._lock:
        hub._subscriptions.setdefault(trip_id, set()).add(mock_ws)

    try:
        event = TripStatusChangedEvent(
            trip_id=trip_id,
            status=TripStatus.accepted,
            timestamp=datetime.now(timezone.utc),
        )
        await hub._broadcast_status(event)
        assert len(received) == 1
        assert received[0]["event"] == "trip.status_changed"
        assert received[0]["status"] == TripStatus.accepted
        assert received[0]["trip_id"] == trip_id
    finally:
        async with hub._lock:
            hub._subscriptions.get(trip_id, set()).discard(mock_ws)


def test_trip_status_update_broadcast() -> None:
    """TEST-WS-002: clients receive status changes."""
    asyncio.run(_test_client_receives_trip_status())


async def _test_client_receives_driver_location() -> None:
    """TEST-WS-001: client receives driver location update."""
    received: list[dict] = []

    class MockWS:
        async def send_json(self, data: dict) -> None:
            received.append(data)

    mock_ws = MockWS()
    trip_id = "trip-ws-test-001"
    async with hub._lock:
        hub._subscriptions.setdefault(trip_id, set()).add(mock_ws)

    try:
        ts = datetime.now(timezone.utc)
        await hub._broadcast_json(
            trip_id,
            {
                "event": "driver.location",
                "trip_id": trip_id,
                "lat": 38.72,
                "lng": -9.15,
                "timestamp": ts.isoformat(),
            },
        )
        assert len(received) == 1
        assert received[0]["event"] == "driver.location"
        assert received[0]["lat"] == 38.72
        assert received[0]["lng"] == -9.15
    finally:
        async with hub._lock:
            hub._subscriptions.get(trip_id, set()).discard(mock_ws)


def test_driver_location_broadcast_payload() -> None:
    """TEST-WS-001: client receives location update."""
    asyncio.run(_test_client_receives_driver_location())


async def _test_client_receives_new_trip_offer() -> None:
    """B001: driver receives new_trip_offer."""
    received: list[dict] = []

    class MockWS:
        async def send_json(self, data: dict) -> None:
            received.append(data)

    mock_ws = MockWS()
    driver_id = "driver-offer-test"
    await driver_offers_hub.subscribe(driver_id, mock_ws)

    try:
        driver_offers_hub.publish_new_offer(
            driver_id=driver_id,
            offer_id="offer-123",
            trip_id="trip-456",
            origin_lat=38.7,
            origin_lng=-9.1,
            destination_lat=38.8,
            destination_lng=-9.2,
            estimated_price=12.50,
            expires_at=datetime.now(timezone.utc),
        )
        await asyncio.sleep(0.05)  # allow publish task to run
        assert len(received) == 1
        assert received[0]["event"] == "new_trip_offer"
        assert received[0]["offer_id"] == "offer-123"
        assert received[0]["trip_id"] == "trip-456"
    finally:
        await driver_offers_hub.unsubscribe(driver_id, mock_ws)


def test_new_trip_offer_broadcast() -> None:
    """B001: driver receives new_trip_offer event."""
    asyncio.run(_test_client_receives_new_trip_offer())
