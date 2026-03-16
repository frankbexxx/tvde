"""Hub for driver new_trip_offer WebSocket events."""

from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any, Dict, Set

from fastapi import WebSocket


class DriverOffersHub:
    """Subscribe by driver_id; publish new_trip_offer when offer created."""

    def __init__(self) -> None:
        self._subscriptions: Dict[str, Set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def subscribe(self, driver_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            self._subscriptions.setdefault(driver_id, set()).add(websocket)

    async def unsubscribe(self, driver_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            sockets = self._subscriptions.get(driver_id)
            if not sockets:
                return
            sockets.discard(websocket)
            if not sockets:
                self._subscriptions.pop(driver_id, None)

    def publish_new_offer(
        self,
        driver_id: str,
        offer_id: str,
        trip_id: str,
        origin_lat: float,
        origin_lng: float,
        destination_lat: float,
        destination_lng: float,
        estimated_price: float,
        expires_at: datetime,
    ) -> None:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            return
        payload: dict[str, Any] = {
            "event": "new_trip_offer",
            "offer_id": offer_id,
            "trip_id": trip_id,
            "origin_lat": origin_lat,
            "origin_lng": origin_lng,
            "destination_lat": destination_lat,
            "destination_lng": destination_lng,
            "estimated_price": estimated_price,
            "expires_at": expires_at.isoformat(),
        }
        loop.create_task(self._broadcast(driver_id, payload))

    async def _broadcast(self, driver_id: str, payload: dict[str, Any]) -> None:
        async with self._lock:
            sockets = list(self._subscriptions.get(driver_id, set()))

        if not sockets:
            return

        for websocket in sockets:
            try:
                await websocket.send_json(payload)
            except Exception:
                await self.unsubscribe(driver_id, websocket)


driver_offers_hub = DriverOffersHub()
