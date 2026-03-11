"""
Debug script for the map/driver location pipeline.

Steps:
  1. POST /dev/seed (ensure driver/passenger exist)
  2. POST /dev/tokens (get driver, passenger, admin tokens)
  3. POST /drivers/location (driver sends location)
  4. POST /trips (passenger creates trip)
  5. POST /admin/trips/{trip_id}/assign (admin assigns trip)
  6. POST /driver/trips/{trip_id}/accept (driver accepts)
  7. GET /trips/{trip_id}/driver-location (passenger fetches driver location)
  8. GET /debug/driver-locations (optional: list all stored locations)

Usage (from repo root, backend running, ENV=dev):
  python scripts/debug_map_pipeline.py
"""

from __future__ import annotations

import json
import os
import time

import requests

API_BASE = os.environ.get("API_BASE", "http://localhost:8000")


def main() -> None:
    print("API_BASE:", API_BASE)

    print("\n1) POST /dev/seed")
    r = requests.post(f"{API_BASE}/dev/seed")
    print("   status:", r.status_code)
    if r.status_code not in (200, 404):
        print("   body:", r.text)
    if r.status_code == 200:
        print("   body:", r.json())

    print("\n2) POST /dev/tokens")
    r = requests.post(f"{API_BASE}/dev/tokens")
    if r.status_code != 200:
        print("   status:", r.status_code, r.text)
        return
    tokens = r.json()
    driver_token = tokens["driver"]
    passenger_token = tokens["passenger"]
    admin_token = tokens["admin"]
    print("   got driver, passenger, admin tokens")

    def driver_headers():
        return {"Authorization": f"Bearer {driver_token}"}

    def passenger_headers():
        return {"Authorization": f"Bearer {passenger_token}"}

    def admin_headers():
        return {"Authorization": f"Bearer {admin_token}"}

    print("\n3) POST /drivers/location")
    ts_ms = int(time.time() * 1000)
    r = requests.post(
        f"{API_BASE}/drivers/location",
        headers=driver_headers(),
        json={"lat": 38.7223, "lng": -9.1393, "timestamp": ts_ms},
    )
    print("   status:", r.status_code, r.text or "(no body)")

    print("\n4) POST /trips (create trip)")
    r = requests.post(
        f"{API_BASE}/trips",
        headers=passenger_headers(),
        json={
            "origin_lat": 38.7223,
            "origin_lng": -9.1393,
            "destination_lat": 38.7369,
            "destination_lng": -9.1386,
        },
    )
    print("   status:", r.status_code)
    if r.status_code != 200:
        print("   body:", r.text)
        return
    trip_id = r.json()["trip_id"]
    print("   trip_id:", trip_id)

    print("\n5) POST /admin/trips/{trip_id}/assign")
    r = requests.post(
        f"{API_BASE}/admin/trips/{trip_id}/assign",
        headers=admin_headers(),
    )
    print("   status:", r.status_code)
    if r.status_code != 200:
        print("   body:", r.text)

    print("\n6) POST /driver/trips/{trip_id}/accept")
    r = requests.post(
        f"{API_BASE}/driver/trips/{trip_id}/accept",
        headers=driver_headers(),
    )
    print("   status:", r.status_code)
    if r.status_code != 200:
        print("   body:", r.text)

    print("\n7) GET /trips/{trip_id}/driver-location")
    r = requests.get(
        f"{API_BASE}/trips/{trip_id}/driver-location",
        headers=passenger_headers(),
    )
    print("   status:", r.status_code)
    if r.status_code == 200:
        print("   body:", json.dumps(r.json(), indent=2))
    else:
        print("   body:", r.text)

    print("\n8) GET /debug/driver-locations")
    r = requests.get(f"{API_BASE}/debug/driver-locations")
    print("   status:", r.status_code)
    if r.status_code == 200:
        print("   body:", json.dumps(r.json(), indent=2))
    else:
        print("   body:", r.text)


if __name__ == "__main__":
    main()
