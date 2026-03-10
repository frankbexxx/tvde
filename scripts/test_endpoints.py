"""
Quick integration sanity check for driver location and matching endpoints.

Usage (from repo root, with backend running and test DB configured):

    python scripts/test_endpoints.py
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, Dict

import requests


API_BASE = os.environ.get("TEST_API_URL", "http://localhost:8000")


@dataclass
class Tokens:
  access_token: str


def _login(email: str, password: str) -> Tokens:
  r = requests.post(f"{API_BASE}/auth/login", json={"email": email, "password": password})
  r.raise_for_status()
  body = r.json()
  return Tokens(access_token=body["access_token"])


def _auth_headers(tokens: Tokens) -> Dict[str, str]:
  return {"Authorization": f"Bearer {tokens.access_token}"}


def main() -> None:
  driver_email = os.environ.get("TEST_DRIVER_EMAIL")
  driver_password = os.environ.get("TEST_DRIVER_PASSWORD")
  passenger_email = os.environ.get("TEST_PASSENGER_EMAIL")
  passenger_password = os.environ.get("TEST_PASSENGER_PASSWORD")

  if not all([driver_email, driver_password, passenger_email, passenger_password]):
    print("Missing TEST_DRIVER_EMAIL/TEST_DRIVER_PASSWORD/TEST_PASSENGER_EMAIL/TEST_PASSENGER_PASSWORD env vars.")
    return

  print("1) Authenticating driver...")
  driver_tokens = _login(driver_email, driver_password)

  print("2) Sending driver location...")
  loc_resp = requests.post(
    f"{API_BASE}/drivers/location",
    headers=_auth_headers(driver_tokens),
    json={
      "lat": 38.7223,
      "lng": -9.1393,
      "timestamp": __import__("time").time_ns() // 1_000_000,
    },
  )
  print("   /drivers/location ->", loc_resp.status_code, loc_resp.text)

  print("3) Authenticating passenger...")
  passenger_tokens = _login(passenger_email, passenger_password)

  print("4) Creating test trip...")
  trip_resp = requests.post(
    f"{API_BASE}/trips",
    headers=_auth_headers(passenger_tokens),
    json={
      "origin_lat": 38.7223,
      "origin_lng": -9.1393,
      "destination_lat": 38.7369,
      "destination_lng": -9.1386,
    },
  )
  print("   /trips ->", trip_resp.status_code, trip_resp.text)
  trip_resp.raise_for_status()
  trip_body = trip_resp.json()
  trip_id = trip_body["trip_id"]

  print("5) Fetching driver location for trip...")
  track_resp = requests.get(
    f"{API_BASE}/trips/{trip_id}/driver-location",
    headers=_auth_headers(passenger_tokens),
  )
  print("   /trips/{trip_id}/driver-location ->", track_resp.status_code, track_resp.text)

  print("6) Matching nearest driver for passenger location...")
  match_resp = requests.post(
    f"{API_BASE}/matching/find-driver",
    headers=_auth_headers(passenger_tokens),
    json={"lat": 38.7223, "lng": -9.1393},
  )
  print("   /matching/find-driver ->", match_resp.status_code, match_resp.text)


if __name__ == "__main__":
  main()

