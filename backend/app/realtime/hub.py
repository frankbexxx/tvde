from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any, Dict, Set

from fastapi import WebSocket

from app.schemas.realtime import TripStatusChangedEvent


class RealtimeHub:
    def __init__(self) -> None:
        self._subscriptions: Dict[str, Set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def subscribe(self, trip_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            self._subscriptions.setdefault(trip_id, set()).add(websocket)

    async def unsubscribe(self, trip_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            sockets = self._subscriptions.get(trip_id)
            if not sockets:
                return
            sockets.discard(websocket)
            if not sockets:
                self._subscriptions.pop(trip_id, None)

    def publish(self, event: TripStatusChangedEvent) -> None:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            return
        loop.create_task(self._broadcast_status(event))

    def publish_driver_location(
        self,
        trip_id: str,
        lat: float,
        lng: float,
        timestamp: datetime,
    ) -> None:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            return
        loop.create_task(
            self._broadcast_json(
                trip_id,
                {
                    "event": "driver.location",
                    "trip_id": trip_id,
                    "lat": lat,
                    "lng": lng,
                    "timestamp": timestamp.isoformat(),
                },
            )
        )

    async def _broadcast_status(self, event: TripStatusChangedEvent) -> None:
        payload: dict[str, Any] = {
            "event": "trip.status_changed",
            "trip_id": event.trip_id,
            "status": event.status,
            "timestamp": event.timestamp.isoformat(),
        }
        await self._broadcast_json(event.trip_id, payload)

    async def _broadcast_json(self, trip_id: str, payload: dict[str, Any]) -> None:
        async with self._lock:
            sockets = list(self._subscriptions.get(trip_id, set()))

        if not sockets:
            return

        for websocket in sockets:
            try:
                await websocket.send_json(payload)
            except Exception:
                await self.unsubscribe(trip_id, websocket)


hub = RealtimeHub()

