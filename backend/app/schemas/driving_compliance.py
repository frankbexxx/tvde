from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DrivingHoursComplianceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    enabled: bool
    enforcement_enabled: bool = False
    # Seconds in rolling 24h window (field name kept for FE compatibility).
    active_seconds_today: int
    max_seconds: int
    warning_threshold_seconds: int
    warning: bool
    limit_reached: bool = False
    blocked: bool
    # Legacy: optional rest-until; no longer set automatically after 10h.
    rest_until: datetime | None
    legacy_rest_active: bool = False
    window_seconds: int = 86400
    counted_policy: str | None = None
