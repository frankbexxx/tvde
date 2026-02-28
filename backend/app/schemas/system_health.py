"""Schemas for system health / observability endpoints."""

from typing import Any

from pydantic import BaseModel


class SystemHealthResponse(BaseModel):
    """Read-only detection of stuck states and inconsistencies."""

    stuck_payments: list[dict[str, Any]] = []
    stuck_trips: list[dict[str, Any]] = []
    inconsistent_financial_state: list[dict[str, Any]] = []
    orphan_payments: list[dict[str, Any]] = []
    missing_payment_records: list[dict[str, Any]] = []


class RunTimeoutsResponse(BaseModel):
    """Counts of timeout actions applied."""

    assigned_to_requested: int = 0
    accepted_to_cancelled: int = 0
    ongoing_to_failed: int = 0
