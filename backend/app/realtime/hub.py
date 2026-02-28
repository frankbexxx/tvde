from __future__ import annotations

import asyncio
from typing import Dict, Set

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

        loop.create_task(self._broadcast(event))

    async def _broadcast(self, event: TripStatusChangedEvent) -> None:
        async with self._lock:
            sockets = list(self._subscriptions.get(event.trip_id, set()))

        if not sockets:
            return

        payload = {
            "trip_id": event.trip_id,
            "status": event.status,
            "timestamp": event.timestamp,
        }
        for websocket in sockets:
            try:
                await websocket.send_json(payload)
            except Exception:
                await self.unsubscribe(event.trip_id, websocket)


hub = RealtimeHub()

