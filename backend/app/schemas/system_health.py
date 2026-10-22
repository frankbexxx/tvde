"""Schemas for system health / observability endpoints."""

from typing import Any

from pydantic import BaseModel, Field


class PaymentWebhookAnomalyTypeCount(BaseModel):
    anomaly_type: str
    count: int


class PaymentWebhookAnomalyRecentItem(BaseModel):
    id: str
    anomaly_type: str
    severity: str
    created_at: str
    payment_intent_id: str | None = None
    trip_id: str | None = None
    payment_id: str | None = None
    event_type: str | None = None
    stripe_event_id: str | None = None
    environment: str | None = None
    stripe_mode: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


class PaymentWebhookAnomaliesHealthBlock(BaseModel):
    """Read-only O-PAY PR2 summary (does not affect health status)."""

    persist_enabled: bool
    data_available: bool = True
    window_hours: int = 24
    total_in_window: int = 0
    counts_by_type: list[PaymentWebhookAnomalyTypeCount] = Field(default_factory=list)
    counts_by_severity: dict[str, int] = Field(default_factory=dict)
    recent: list[PaymentWebhookAnomalyRecentItem] = Field(default_factory=list)


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
    informational_warnings: list[str] = []
    payment_webhook_anomalies: PaymentWebhookAnomaliesHealthBlock | None = None


class RunTimeoutsResponse(BaseModel):
    """Counts of timeout actions applied."""

    assigned_to_requested: int = 0
    accepted_to_cancelled: int = 0
    ongoing_to_failed: int = 0


class RunOfferExpiryResponse(BaseModel):
    """Result of offer expiry and redispatch."""

    expired_count: int = 0
    redispatch_offers_created: int = 0


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
