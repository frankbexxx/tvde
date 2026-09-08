"""Admin KYC supervision — read-only aggregates (G-KYC-P0-02)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class AdminKycDocItem(BaseModel):
    doc_key: str
    stored_status: str
    expires_at: str | None = None
    computed_status: str | None = None
    is_expired: bool = False
    is_expiring_soon: bool = False
    has_file: bool = False


class AdminKycDriverRow(BaseModel):
    user_id: str
    driver_name: str | None = None
    driver_phone: str | None = None
    partner_id: str
    partner_name: str | None = None
    driver_status: str
    documents: list[AdminKycDocItem] = Field(default_factory=list)


class AdminKycVehicleRow(BaseModel):
    vehicle_id: str
    plate: str
    partner_id: str
    partner_name: str | None = None
    status: str
    assigned_driver_user_id: str | None = None
    assigned_driver_name: str | None = None
    documents: list[AdminKycDocItem] = Field(default_factory=list)
    worst_document_status: str | None = None


class AdminKycPartnerOption(BaseModel):
    id: str
    name: str


class AdminKycAlertsSummary(BaseModel):
    drivers_with_expired_docs: int = 0
    drivers_with_pending_or_rejected_docs: int = 0
    vehicles_with_expired_docs: int = 0
    vehicles_with_expiring_soon_docs: int = 0
    vehicles_inactive: int = 0


class AdminKycSupervisionResponse(BaseModel):
    """Read-only KYC snapshot for Admin supervision (no mutations)."""

    subject: Literal["kyc_supervision"] = "kyc_supervision"
    alerts: AdminKycAlertsSummary
    partners: list[AdminKycPartnerOption] = Field(default_factory=list)
    drivers: list[AdminKycDriverRow] = Field(default_factory=list)
    vehicles: list[AdminKycVehicleRow] = Field(default_factory=list)
