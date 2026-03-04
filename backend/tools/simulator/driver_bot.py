"""
Driver bot: polls available trips, accepts one, simulates human flow (arriving → start → complete).
"""
import asyncio
import random

from .api_client import (
    list_available_trips,
    accept_trip,
    arriving_trip,
    start_trip,
    complete_trip,
)

ARRIVING_SLEEP_MIN, ARRIVING_SLEEP_MAX = 10, 20  # seconds
START_SLEEP_MIN, START_SLEEP_MAX = 10, 20
COMPLETE_SLEEP_MIN, COMPLETE_SLEEP_MAX = 60, 120
NO_TRIPS_SLEEP_MIN, NO_TRIPS_SLEEP_MAX = 5, 10


class DriverBot:
    def __init__(self, bot_id: int, token: str):
        self.bot_id = bot_id
        self.token = token

    def _log(self, msg: str) -> None:
        print(f"[DriverBot {self.bot_id}] {msg}")

    async def run(self) -> None:
        while True:
            try:
                trips = list_available_trips(self.token)
                if not trips:
                    wait = random.uniform(NO_TRIPS_SLEEP_MIN, NO_TRIPS_SLEEP_MAX)
                    await asyncio.sleep(wait)
                    continue

                trip = random.choice(trips)
                trip_id = trip["trip_id"]
                try:
                    accept_trip(self.token, trip_id)
                except Exception as e:
                    self._log(f"accept failed for {trip_id}: {e}")
                    await asyncio.sleep(1)
                    continue

                self._log(f"accepted trip {trip_id}")

                await asyncio.sleep(random.uniform(ARRIVING_SLEEP_MIN, ARRIVING_SLEEP_MAX))
                arriving_trip(self.token, trip_id)
                self._log(f"arriving trip {trip_id}")

                await asyncio.sleep(random.uniform(START_SLEEP_MIN, START_SLEEP_MAX))
                start_trip(self.token, trip_id)
                self._log(f"started trip {trip_id}")

                await asyncio.sleep(random.uniform(COMPLETE_SLEEP_MIN, COMPLETE_SLEEP_MAX))
                complete_trip(self.token, trip_id)
                self._log(f"completed trip {trip_id}")

            except asyncio.CancelledError:
                raise
            except Exception as e:
                self._log(f"error: {e}")
                await asyncio.sleep(5)
