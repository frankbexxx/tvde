"""
HTTP client for TVDE API. Uses httpx with timeout and error handling.
"""

import time
import threading

import httpx

from .config import API_BASE_URL, REQUEST_TIMEOUT_SEC, MAX_REQUESTS_PER_SECOND

# Rate limiter state
_rate_timestamps: list[float] = []
_rate_lock = threading.Lock()


def _rate_limit_sync() -> None:
    """Block if we exceed MAX_REQUESTS_PER_SECOND."""
    if MAX_REQUESTS_PER_SECOND <= 0:
        return
    now = time.monotonic()
    with _rate_lock:
        _rate_timestamps[:] = [t for t in _rate_timestamps if now - t < 1.0]
        if len(_rate_timestamps) >= MAX_REQUESTS_PER_SECOND:
            sleep_time = 1.0 - (now - _rate_timestamps[0])
            if sleep_time > 0:
                time.sleep(sleep_time)
            _rate_timestamps[:] = [
                t for t in _rate_timestamps if time.monotonic() - t < 1.0
            ]
        _rate_timestamps.append(time.monotonic())


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def create_trip(
    passenger_token: str,
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
) -> dict:
    """POST /trips — create trip as passenger."""
    _rate_limit_sync()
    url = f"{API_BASE_URL}/trips"
    payload = {
        "origin_lat": origin_lat,
        "origin_lng": origin_lng,
        "destination_lat": dest_lat,
        "destination_lng": dest_lng,
    }
    r = httpx.post(
        url,
        json=payload,
        headers=_headers(passenger_token),
        timeout=REQUEST_TIMEOUT_SEC,
    )
    r.raise_for_status()
    return r.json()


def cancel_trip(passenger_token: str, trip_id: str) -> dict:
    """POST /trips/{trip_id}/cancel — cancel trip as passenger."""
    _rate_limit_sync()
    url = f"{API_BASE_URL}/trips/{trip_id}/cancel"
    r = httpx.post(
        url, json={}, headers=_headers(passenger_token), timeout=REQUEST_TIMEOUT_SEC
    )
    r.raise_for_status()
    return r.json()


def list_available_trips(driver_token: str) -> list:
    """GET /driver/trips/available — list trips available for driver."""
    _rate_limit_sync()
    url = f"{API_BASE_URL}/driver/trips/available"
    r = httpx.get(url, headers=_headers(driver_token), timeout=REQUEST_TIMEOUT_SEC)
    r.raise_for_status()
    return r.json()


def accept_trip(driver_token: str, trip_id: str) -> dict:
    """POST /driver/trips/{trip_id}/accept."""
    _rate_limit_sync()
    url = f"{API_BASE_URL}/driver/trips/{trip_id}/accept"
    r = httpx.post(url, headers=_headers(driver_token), timeout=REQUEST_TIMEOUT_SEC)
    r.raise_for_status()
    return r.json()


def get_driver_trip_detail(driver_token: str, trip_id: str) -> dict:
    """GET /driver/trips/{trip_id} — origin/destination for proximity sync."""
    _rate_limit_sync()
    url = f"{API_BASE_URL}/driver/trips/{trip_id}"
    r = httpx.get(url, headers=_headers(driver_token), timeout=REQUEST_TIMEOUT_SEC)
    r.raise_for_status()
    return r.json()


def post_driver_location(driver_token: str, lat: float, lng: float) -> None:
    """POST /drivers/location — required before start if not already at pickup."""
    _rate_limit_sync()
    url = f"{API_BASE_URL}/drivers/location"
    payload = {
        "lat": lat,
        "lng": lng,
        "timestamp": int(time.time() * 1000),
    }
    r = httpx.post(
        url,
        json=payload,
        headers=_headers(driver_token),
        timeout=REQUEST_TIMEOUT_SEC,
    )
    r.raise_for_status()


def arriving_trip(driver_token: str, trip_id: str) -> dict:
    """POST /driver/trips/{trip_id}/arriving."""
    _rate_limit_sync()
    url = f"{API_BASE_URL}/driver/trips/{trip_id}/arriving"
    r = httpx.post(url, headers=_headers(driver_token), timeout=REQUEST_TIMEOUT_SEC)
    r.raise_for_status()
    return r.json()


def start_trip(driver_token: str, trip_id: str) -> dict:
    """POST /driver/trips/{trip_id}/start."""
    _rate_limit_sync()
    url = f"{API_BASE_URL}/driver/trips/{trip_id}/start"
    r = httpx.post(url, headers=_headers(driver_token), timeout=REQUEST_TIMEOUT_SEC)
    r.raise_for_status()
    return r.json()


def complete_trip(driver_token: str, trip_id: str) -> dict:
    """POST /driver/trips/{trip_id}/complete."""
    _rate_limit_sync()
    url = f"{API_BASE_URL}/driver/trips/{trip_id}/complete"
    r = httpx.post(
        url,
        json={"final_price": 0},
        headers=_headers(driver_token),
        timeout=REQUEST_TIMEOUT_SEC,
    )
    r.raise_for_status()
    return r.json()
