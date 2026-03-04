"""
HTTP client for TVDE API. Uses httpx with timeout and error handling.
"""
import httpx

from .config import API_BASE_URL, REQUEST_TIMEOUT_SEC


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def create_trip(passenger_token: str, origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float) -> dict:
    """POST /trips — create trip as passenger."""
    url = f"{API_BASE_URL}/trips"
    payload = {
        "origin_lat": origin_lat,
        "origin_lng": origin_lng,
        "destination_lat": dest_lat,
        "destination_lng": dest_lng,
    }
    r = httpx.post(url, json=payload, headers=_headers(passenger_token), timeout=REQUEST_TIMEOUT_SEC)
    r.raise_for_status()
    return r.json()


def cancel_trip(passenger_token: str, trip_id: str) -> dict:
    """POST /trips/{trip_id}/cancel — cancel trip as passenger."""
    url = f"{API_BASE_URL}/trips/{trip_id}/cancel"
    r = httpx.post(url, json={}, headers=_headers(passenger_token), timeout=REQUEST_TIMEOUT_SEC)
    r.raise_for_status()
    return r.json()


def list_available_trips(driver_token: str) -> list:
    """GET /driver/trips/available — list trips available for driver."""
    url = f"{API_BASE_URL}/driver/trips/available"
    r = httpx.get(url, headers=_headers(driver_token), timeout=REQUEST_TIMEOUT_SEC)
    r.raise_for_status()
    return r.json()


def accept_trip(driver_token: str, trip_id: str) -> dict:
    """POST /driver/trips/{trip_id}/accept."""
    url = f"{API_BASE_URL}/driver/trips/{trip_id}/accept"
    r = httpx.post(url, headers=_headers(driver_token), timeout=REQUEST_TIMEOUT_SEC)
    r.raise_for_status()
    return r.json()


def arriving_trip(driver_token: str, trip_id: str) -> dict:
    """POST /driver/trips/{trip_id}/arriving."""
    url = f"{API_BASE_URL}/driver/trips/{trip_id}/arriving"
    r = httpx.post(url, headers=_headers(driver_token), timeout=REQUEST_TIMEOUT_SEC)
    r.raise_for_status()
    return r.json()


def start_trip(driver_token: str, trip_id: str) -> dict:
    """POST /driver/trips/{trip_id}/start."""
    url = f"{API_BASE_URL}/driver/trips/{trip_id}/start"
    r = httpx.post(url, headers=_headers(driver_token), timeout=REQUEST_TIMEOUT_SEC)
    r.raise_for_status()
    return r.json()


def complete_trip(driver_token: str, trip_id: str) -> dict:
    """POST /driver/trips/{trip_id}/complete."""
    url = f"{API_BASE_URL}/driver/trips/{trip_id}/complete"
    r = httpx.post(url, json={"final_price": 0}, headers=_headers(driver_token), timeout=REQUEST_TIMEOUT_SEC)
    r.raise_for_status()
    return r.json()
