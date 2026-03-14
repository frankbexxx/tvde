#!/usr/bin/env python3
"""
Automated integration test: simulator + create trip + verify completion.

Runs without manual steps. Requires backend running with ENABLE_DEV_TOOLS.

Usage (from repo root):
    python scripts/test_simulator_trip.py
    API_BASE=https://tvde-api-fd2z.onrender.com python scripts/test_simulator_trip.py
"""
from __future__ import annotations

import asyncio
import os
import sys

# Ensure scripts/ is on path for driver_simulator import
_scripts_dir = os.path.dirname(os.path.abspath(__file__))
if _scripts_dir not in sys.path:
    sys.path.insert(0, _scripts_dir)
import time

try:
    import httpx
except ImportError:
    print("Install httpx: pip install httpx")
    sys.exit(1)

API_BASE = os.environ.get("API_BASE", "http://localhost:8000").rstrip("/")
POLL_INTERVAL = 2.0
MAX_WAIT_S = 90  # arriving 5-10s + start 5-10s + trip 10-20s + buffer


async def check_health(api_base: str) -> None:
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.get(f"{api_base}/health", params={"diagnostic": "1"})
        if r.status_code != 200:
            raise RuntimeError(f"Health {r.status_code}: {r.text[:200]}")
        data = r.json()
        if not data.get("dev_tools", False):
            raise RuntimeError("dev_tools=false — set ENABLE_DEV_TOOLS=true or ENV=dev")


async def seed(api_base: str, drivers: int = 1, passengers: int = 1) -> tuple[list[str], list[str]]:
    async with httpx.AsyncClient(timeout=90.0) as client:
        r = await client.post(
            f"{api_base}/dev/seed-simulator",
            params={"passengers": passengers, "drivers": drivers},
        )
        if r.status_code != 200:
            raise RuntimeError(f"seed-simulator {r.status_code}: {r.text[:500]}")
        data = r.json()
        return data["driver_tokens"], data["passenger_tokens"]


async def create_trip(
    client: httpx.AsyncClient,
    api_base: str,
    token: str,
    origin_lat: float = 38.7223,
    origin_lng: float = -9.1393,
    dest_lat: float = 38.7369,
    dest_lng: float = -9.1386,
) -> str:
    r = await client.post(
        f"{api_base}/trips",
        json={
            "origin_lat": origin_lat,
            "origin_lng": origin_lng,
            "destination_lat": dest_lat,
            "destination_lng": dest_lng,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    if r.status_code != 200:
        raise RuntimeError(f"create trip {r.status_code}: {r.text[:500]}")
    return r.json()["trip_id"]


async def get_trip_status(
    client: httpx.AsyncClient,
    api_base: str,
    token: str,
    trip_id: str,
) -> str:
    r = await client.get(
        f"{api_base}/trips/{trip_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    if r.status_code != 200:
        raise RuntimeError(f"get trip {r.status_code}: {r.text[:200]}")
    return r.json()["status"]


async def run_driver_until_trip_done(
    driver_token: str,
    api_base: str,
    interval_s: float = 1.5,
) -> None:
    """Single driver loop until we've processed at least one trip (simplified)."""
    from driver_simulator import (
        get_available_trips,
        accept_trip,
        mark_arriving,
        start_trip,
        complete_trip,
        send_location,
        random_offset,
    )
    base_lat, base_lng = 38.7223, -9.1393
    async with httpx.AsyncClient(timeout=15.0) as client:
        while True:
            lat, lng = random_offset(base_lat, base_lng)
            await send_location(client, api_base, driver_token, lat, lng)
            trips = await get_available_trips(client, api_base, driver_token)
            if trips:
                trip_id = trips[0]["trip_id"]
                if await accept_trip(client, api_base, driver_token, trip_id):
                    await asyncio.sleep(3)
                    await mark_arriving(client, api_base, driver_token, trip_id)
                    await asyncio.sleep(3)
                    await start_trip(client, api_base, driver_token, trip_id)
                    await asyncio.sleep(8)
                    await complete_trip(client, api_base, driver_token, trip_id)
                    return
            await asyncio.sleep(interval_s)


async def main() -> int:
    print(f"[test_simulator_trip] API_BASE={API_BASE}")
    print("1. Health check...")
    try:
        await check_health(API_BASE)
    except Exception as e:
        print(f"FAIL: {e}")
        print("   (Start backend: cd backend && uvicorn app.main:app --reload)")
        return 1
    print("   OK")

    print("2. Seed 1 driver + 1 passenger...")
    try:
        driver_tokens, passenger_tokens = await seed(API_BASE, drivers=1, passengers=1)
    except Exception as e:
        print(f"FAIL: {e}")
        return 1
    if not driver_tokens or not passenger_tokens:
        print("FAIL: no tokens returned")
        return 1
    print("   OK")

    print("3. Start driver in background...")
    driver_task = asyncio.create_task(
        run_driver_until_trip_done(driver_tokens[0], API_BASE),
    )

    print("4. Create trip as passenger...")
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            trip_id = await create_trip(client, API_BASE, passenger_tokens[0])
        except Exception as e:
            print(f"FAIL: {e}")
            driver_task.cancel()
            return 1
    print(f"   trip_id={trip_id}")

    print("5. Wait for driver to complete (polling trip status)...")
    start = time.monotonic()
    async with httpx.AsyncClient(timeout=15.0) as client:
        while time.monotonic() - start < MAX_WAIT_S:
            try:
                status = await get_trip_status(client, API_BASE, passenger_tokens[0], trip_id)
            except Exception as e:
                print(f"   poll error: {e}")
                await asyncio.sleep(POLL_INTERVAL)
                continue
            if status == "completed":
                print(f"   status={status} — OK")
                driver_task.cancel()
                try:
                    await driver_task
                except asyncio.CancelledError:
                    pass
                print("PASS")
                return 0
            if status in ("cancelled", "failed"):
                print(f"FAIL: trip ended with status={status}")
                driver_task.cancel()
                return 1
            await asyncio.sleep(POLL_INTERVAL)
    print("FAIL: timeout waiting for completed")
    driver_task.cancel()
    return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
