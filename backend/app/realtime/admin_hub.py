from __future__ import annotations

import asyncio
from typing import Set

from fastapi import WebSocket

from app.schemas.realtime import TripStatusChangedEvent


class AdminRealtimeHub:
    def __init__(self) -> None:
        self._subscribers: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def subscribe(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._subscribers.add(websocket)

    async def unsubscribe(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._subscribers.discard(websocket)

    def publish(self, event: TripStatusChangedEvent) -> None:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            return
        loop.create_task(self._broadcast(event))

    async def _broadcast(self, event: TripStatusChangedEvent) -> None:
        async with self._lock:
            sockets = list(self._subscribers)

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
                await self.unsubscribe(websocket)


admin_hub = AdminRealtimeHub()
