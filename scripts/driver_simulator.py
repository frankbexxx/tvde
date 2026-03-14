#!/usr/bin/env python3
"""
Driver Simulation Engine — PROMPT_02

Standalone script that simulates multiple drivers interacting with the TVDE API.
Uses existing endpoints only. No backend modifications.

Usage:
    python scripts/driver_simulator.py --drivers 10
    python scripts/driver_simulator.py --drivers 50 --interval 3 --base-lat 38.72 --base-lng -9.14

    # Against Render (same DB as frontend):
    API_BASE=https://tvde-api-fd2z.onrender.com python scripts/driver_simulator.py --drivers 10

Requires: backend with ENABLE_DEV_TOOLS=true or ENV=dev (for /dev/seed-simulator).
"""
import argparse
import asyncio
import random
import sys
import time
from typing import Any

try:
    import httpx
except ImportError:
    print("Install httpx: pip install httpx")
    sys.exit(1)

# --- Config ---
DEFAULT_API_BASE = "http://localhost:8000"
RENDER_API_BASE = "https://tvde-api-fd2z.onrender.com"
DEFAULT_BASE_LAT = 38.7223
DEFAULT_BASE_LNG = -9.1393
LOCATION_OFFSET = 0.002
ARRIVING_DELAY = (5, 10)
START_DELAY = (5, 10)
TRIP_DURATION = (10, 20)


def log(driver_id: int, msg: str) -> None:
    print(f"[driver_{driver_id}] {msg}", flush=True)


async def check_connectivity(api_base: str, verbose: bool = False) -> dict:
    """Verify we can reach the API. Returns health payload. Raises on failure."""
    # GET /health — pedido mínimo; timeout 60s (Render cold start ~50s)
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.get(f"{api_base}/health")
        if r.status_code != 200:
            raise RuntimeError(f"Health {r.status_code}: {r.text[:200]}")
        return r.json()


async def seed_drivers(api_base: str, count: int) -> tuple[list[str], list[str]]:
    """Get driver and passenger tokens via /dev/seed-simulator. Returns (driver_tokens, passenger_tokens)."""
    async with httpx.AsyncClient(timeout=90.0) as client:
        r = await client.post(
            f"{api_base}/dev/seed-simulator",
            params={"passengers": 1, "drivers": count},
        )
        if r.status_code == 404:
            raise RuntimeError(
                "seed-simulator 404 — set ENABLE_DEV_TOOLS=true or ENV=dev. "
                "Check backend startup logs for config."
            )
        if r.status_code != 200:
            raise RuntimeError(f"seed-simulator {r.status_code}: {r.text[:500]}")
        data = r.json()
        return data["driver_tokens"], data.get("passenger_tokens", [])


async def send_location(
    client: httpx.AsyncClient,
    api_base: str,
    token: str,
    lat: float,
    lng: float,
) -> bool:
    """POST /drivers/location."""
    try:
        r = await client.post(
            f"{api_base}/drivers/location",
            json={"lat": lat, "lng": lng, "timestamp": int(time.time() * 1000)},
            headers={"Authorization": f"Bearer {token}"},
        )
        return r.status_code == 204
    except Exception:
        return False


async def get_available_trips(
    client: httpx.AsyncClient,
    api_base: str,
    token: str,
) -> list[dict[str, Any]]:
    """GET /driver/trips/available."""
    try:
        r = await client.get(
            f"{api_base}/driver/trips/available",
            headers={"Authorization": f"Bearer {token}"},
        )
        if r.status_code != 200:
            return []
        return r.json()
    except Exception:
        return []


async def accept_trip(
    client: httpx.AsyncClient,
    api_base: str,
    token: str,
    trip_id: str,
) -> bool:
    """POST /driver/trips/{id}/accept."""
    try:
        r = await client.post(
            f"{api_base}/driver/trips/{trip_id}/accept",
            headers={"Authorization": f"Bearer {token}"},
        )
        return r.status_code == 200
    except Exception:
        return False


async def mark_arriving(
    client: httpx.AsyncClient,
    api_base: str,
    token: str,
    trip_id: str,
) -> bool:
    """POST /driver/trips/{id}/arriving."""
    try:
        r = await client.post(
            f"{api_base}/driver/trips/{trip_id}/arriving",
            headers={"Authorization": f"Bearer {token}"},
        )
        return r.status_code == 200
    except Exception:
        return False


async def start_trip(
    client: httpx.AsyncClient,
    api_base: str,
    token: str,
    trip_id: str,
) -> bool:
    """POST /driver/trips/{id}/start."""
    try:
        r = await client.post(
            f"{api_base}/driver/trips/{trip_id}/start",
            headers={"Authorization": f"Bearer {token}"},
        )
        return r.status_code == 200
    except Exception:
        return False


# Complete does Stripe update+confirm+capture — can take 15–30s on Render
COMPLETE_TIMEOUT = 45.0


async def complete_trip(
    client: httpx.AsyncClient,
    api_base: str,
    token: str,
    trip_id: str,
) -> tuple[bool, str]:
    """POST /driver/trips/{id}/complete. Returns (success, error_msg)."""
    try:
        r = await client.post(
            f"{api_base}/driver/trips/{trip_id}/complete",
            json={"final_price": 0},
            headers={"Authorization": f"Bearer {token}"},
            timeout=COMPLETE_TIMEOUT,
        )
        if r.status_code == 200:
            return True, ""
        body = r.text[:300] if r.text else ""
        return False, f"{r.status_code} {body}"
    except Exception as e:
        return False, repr(e)


def random_offset(base_lat: float, base_lng: float) -> tuple[float, float]:
    """Slight random offset around base (simulates movement)."""
    lat = base_lat + random.uniform(-LOCATION_OFFSET, LOCATION_OFFSET)
    lng = base_lng + random.uniform(-LOCATION_OFFSET, LOCATION_OFFSET)
    return round(lat, 6), round(lng, 6)


async def run_driver(
    driver_id: int,
    token: str,
    api_base: str,
    interval_s: float,
    base_lat: float,
    base_lng: float,
) -> None:
    """Single driver loop: send location, poll trips, accept, simulate lifecycle."""
    log(driver_id, "online")
    async with httpx.AsyncClient(timeout=15.0) as client:
        while True:
            # 1. Send location
            lat, lng = random_offset(base_lat, base_lng)
            await send_location(client, api_base, token, lat, lng)

            # 2. Check available trips
            trips = await get_available_trips(client, api_base, token)
            if trips:
                trip = trips[0]
                trip_id = trip["trip_id"]
                if await accept_trip(client, api_base, token, trip_id):
                    log(driver_id, f"accepted trip {trip_id}")
                    # 3. Simulate lifecycle
                    await asyncio.sleep(random.uniform(*ARRIVING_DELAY))
                    if await mark_arriving(client, api_base, token, trip_id):
                        log(driver_id, f"arriving trip {trip_id}")
                    await asyncio.sleep(random.uniform(*START_DELAY))
                    if await start_trip(client, api_base, token, trip_id):
                        log(driver_id, f"started trip {trip_id}")
                    duration = random.uniform(*TRIP_DURATION)
                    await asyncio.sleep(duration)
                    ok, err = await complete_trip(client, api_base, token, trip_id)
                    if ok:
                        log(driver_id, f"completed trip {trip_id}")
                    else:
                        log(driver_id, f"complete failed trip {trip_id}: {err}")
                else:
                    log(driver_id, f"accept failed trip {trip_id} (maybe taken)")

            await asyncio.sleep(interval_s)


async def main() -> None:
    parser = argparse.ArgumentParser(description="TVDE Driver Simulator")
    parser.add_argument("--drivers", type=int, default=10, help="Number of drivers")
    parser.add_argument("--interval", type=float, default=3.0, help="Location poll interval (seconds)")
    parser.add_argument("--base-lat", type=float, default=DEFAULT_BASE_LAT, help="Base latitude")
    parser.add_argument("--base-lng", type=float, default=DEFAULT_BASE_LNG, help="Base longitude")
    parser.add_argument(
        "--api-base",
        type=str,
        default=None,
        help=f"API base URL (default: API_BASE env or {DEFAULT_API_BASE}; Render: {RENDER_API_BASE})",
    )
    parser.add_argument("--verbose", "-v", action="store_true", help="Print full errors and diagnostics")
    args = parser.parse_args()

    api_base = args.api_base or __import__("os").environ.get("API_BASE", DEFAULT_API_BASE)
    api_base = api_base.rstrip("/")

    def fail(e: Exception) -> None:
        print(f"Error: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)

    print(f"Checking connectivity to {api_base} ...")
    try:
        await check_connectivity(api_base, verbose=args.verbose)
        print("OK — API reachable")
    except Exception as e:
        fail(e)

    print(f"Seeding {args.drivers} drivers via {api_base}/dev/seed-simulator ...")
    try:
        driver_tokens, passenger_tokens = await seed_drivers(api_base, args.drivers)
    except Exception as e:
        fail(e)

    print(f"Starting {len(driver_tokens)} drivers (interval={args.interval}s, base=({args.base_lat}, {args.base_lng}))")
    print("Ctrl+C to stop.")
    print("-" * 50)

    tasks = [
        asyncio.create_task(
            run_driver(
                i + 1,
                driver_tokens[i],
                api_base,
                args.interval,
                args.base_lat,
                args.base_lng,
            )
        )
        for i in range(len(driver_tokens))
    ]
    try:
        await asyncio.gather(*tasks)
    except asyncio.CancelledError:
        for t in tasks:
            t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)


if __name__ == "__main__":
    asyncio.run(main())
