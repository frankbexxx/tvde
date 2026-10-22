"""PR4 — read-only orphan PaymentIntent preview (super_admin)."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class OrphanPaymentIntentFinding(BaseModel):
    payment_intent_id: str
    stripe_status: str
    orphan_class: str
    finding_kind: str
    trip_id_metadata: str | None = None
    trip_exists: bool | None = None
    amount_cents: int | None = None
    currency: str | None = None
    stripe_created: int | None = None
    payment_row_found: bool = False


class OrphanPaymentIntentInconclusive(BaseModel):
    payment_intent_id: str
    finding_kind: str
    detail: str
    trip_id_metadata: str | None = None
    stripe_status: str | None = None


class OrphanPaymentIntentPreviewResponse(BaseModel):
    scan_run_id: str
    scanned_at: str
    scan_status: str
    skipped: bool = False
    skip_reason: str | None = None
    skip_message: str | None = None
    environment: str
    stripe_mode: str
    window_days: int
    grace_minutes: int
    stripe_list_cap: int
    stripe_pages_fetched: int = 0
    pis_listed: int = 0
    pis_tvde_attributed: int = 0
    ignored_external_count: int = 0
    skipped_grace_count: int = 0
    linked_count: int = 0
    confirmed_orphans: list[OrphanPaymentIntentFinding] = Field(default_factory=list)
    inconclusive: list[OrphanPaymentIntentInconclusive] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)
    has_more: bool = False
    next_starting_after: str | None = None
    request_id: str | None = None
