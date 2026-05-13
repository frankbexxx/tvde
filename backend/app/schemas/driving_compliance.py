from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DrivingHoursComplianceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    enabled: bool
    active_seconds_today: int
    max_seconds: int
    warning_threshold_seconds: int
    warning: bool
    blocked: bool
    rest_until: datetime | None
