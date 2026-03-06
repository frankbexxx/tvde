"""
Passenger bot: creates trips at random intervals, optionally cancels.
"""
import asyncio
import random

import httpx

from .api_client import create_trip, cancel_trip

# Mock coordinates (Lisbon)
ORIGIN = (38.7169, -9.1399)
DEST = (38.7369, -9.1427)

CANCEL_PROBABILITY = 0.2
WAIT_MIN, WAIT_MAX = 20, 120  # seconds between trips
CANCEL_WAIT_MIN, CANCEL_WAIT_MAX = 10, 30  # seconds before optional cancel


class PassengerBot:
    def __init__(self, bot_id: int, token: str, stats=None):
        self.bot_id = bot_id
        self.token = token
        self.stats = stats

    def _log(self, msg: str) -> None:
        print(f"[PassengerBot {self.bot_id}] {msg}")

    async def run(self) -> None:
        while True:
            try:
                wait = random.uniform(WAIT_MIN, WAIT_MAX)
                await asyncio.sleep(wait)

                resp = create_trip(
                    self.token,
                    ORIGIN[0], ORIGIN[1],
                    DEST[0], DEST[1],
                )
                trip_id = resp.get("trip_id")
                if self.stats:
                    self.stats.trips_created += 1
                self._log(f"created trip {trip_id}")

                if random.random() < CANCEL_PROBABILITY:
                    cancel_wait = random.uniform(CANCEL_WAIT_MIN, CANCEL_WAIT_MAX)
                    await asyncio.sleep(cancel_wait)
                    try:
                        cancel_trip(self.token, trip_id)
                        if self.stats:
                            self.stats.trips_cancelled += 1
                        self._log(f"cancelled trip {trip_id}")
                    except httpx.HTTPStatusError as e:
                        if e.response.status_code == 400:
                            if self.stats:
                                self.stats.trips_cancel_failed += 1
                            self._log(f"cancel failed (trip may be ongoing): {trip_id}")
                        else:
                            raise
            except asyncio.CancelledError:
                raise
            except Exception as e:
                self._log(f"error: {e}")
                await asyncio.sleep(5)
