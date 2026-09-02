from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DrivingHoursComplianceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    enabled: bool
    enforcement_enabled: bool = False
    active_seconds_today: int
    max_seconds: int
    warning_threshold_seconds: int
    warning: bool
    limit_reached: bool = False
    blocked: bool
    rest_until: datetime | None
