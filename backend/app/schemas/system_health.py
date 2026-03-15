"""Schemas for system health / observability endpoints."""

from typing import Any

from pydantic import BaseModel


class SystemHealthResponse(BaseModel):
    """Read-only detection of stuck states and inconsistencies."""

    status: str = "ok"  # ok | degraded
    stuck_trips: list[dict[str, Any]] = []  # deprecated
    trips_accepted_too_long: list[dict[str, Any]] = []
    trips_ongoing_too_long: list[dict[str, Any]] = []
    stuck_payments: list[dict[str, Any]] = []
    drivers_unavailable_too_long: list[dict[str, Any]] = []
    missing_payment_records: list[dict[str, Any]] = []
    inconsistent_financial_state: list[dict[str, Any]] = []
    orphan_payments: list[dict[str, Any]] = []  # deprecated
    warnings: list[str] = []


class RunTimeoutsResponse(BaseModel):
    """Counts of timeout actions applied."""

    assigned_to_requested: int = 0
    accepted_to_cancelled: int = 0
    ongoing_to_failed: int = 0


class AdminMetricsResponse(BaseModel):
    """Basic operational metrics for admin dashboard."""

    active_trips: int = 0
    drivers_available: int = 0
    drivers_busy: int = 0
    trips_requested: int = 0
    trips_ongoing: int = 0
    trips_completed_today: int = 0
    trips_created_total: int = 0
    trips_accepted_total: int = 0
    trips_completed_total: int = 0


class RecoverDriverResponse(BaseModel):
    driver_id: str
    is_available: bool
