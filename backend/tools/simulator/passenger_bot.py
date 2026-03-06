"""
Passenger bot: creates trips at random intervals, optionally cancels.
Supports flash_crowd one-shot (create trip simultaneously with others).
"""
import asyncio
import random
from typing import TYPE_CHECKING, Optional

import httpx

from .api_client import create_trip, cancel_trip

if TYPE_CHECKING:
    from .metrics import SimulatorMetrics

# Mock coordinates (Lisbon)
ORIGIN = (38.7169, -9.1399)
DEST = (38.7369, -9.1427)

CANCEL_PROBABILITY = 0.2
WAIT_MIN, WAIT_MAX = 20, 120  # seconds between trips
CANCEL_WAIT_MIN, CANCEL_WAIT_MAX = 10, 30  # seconds before optional cancel


class PassengerBot:
    def __init__(self, bot_id: int, token: str, stats=None, metrics: Optional["SimulatorMetrics"] = None):
        self.bot_id = bot_id
        self.token = token
        self.stats = stats
        self.metrics = metrics

    def _log(self, msg: str) -> None:
        print(f"[PassengerBot {self.bot_id}] {msg}")

    def _create_trip_sync(self) -> Optional[str]:
        """Create one trip (sync). Returns trip_id or None on error."""
        try:
            resp = create_trip(
                self.token,
                ORIGIN[0], ORIGIN[1],
                DEST[0], DEST[1],
            )
            trip_id = resp.get("trip_id")
            if self.stats:
                self.stats.trips_created += 1
            if self.metrics:
                self.metrics.record_trip_created(trip_id)
            self._log(f"trip created {trip_id}")
            return trip_id
        except Exception as e:
            self._log(f"error: {e}")
            return None

    async def create_trip_once(self) -> Optional[str]:
        """One-shot create (for flash_crowd). Run in executor to not block."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._create_trip_sync)

    async def run(self) -> None:
        while True:
            try:
                wait = random.uniform(WAIT_MIN, WAIT_MAX)
                await asyncio.sleep(wait)

                trip_id = self._create_trip_sync()
                if trip_id is None:
                    continue

                if random.random() < CANCEL_PROBABILITY:
                    cancel_wait = random.uniform(CANCEL_WAIT_MIN, CANCEL_WAIT_MAX)
                    await asyncio.sleep(cancel_wait)
                    try:
                        cancel_trip(self.token, trip_id)
                        if self.stats:
                            self.stats.trips_cancelled += 1
                        if self.metrics:
                            self.metrics.record_cancel(trip_id)
                        self._log(f"cancelled trip {trip_id}")
                    except httpx.HTTPStatusError as e:
                        if e.response.status_code == 400:
                            if self.stats:
                                self.stats.trips_cancel_failed += 1
                            if self.metrics:
                                self.metrics.record_cancel_failed()
                            self._log(f"cancel failed (trip may be ongoing): {trip_id}")
                        else:
                            raise
            except asyncio.CancelledError:
                raise
            except Exception as e:
                self._log(f"error: {e}")
                await asyncio.sleep(5)
