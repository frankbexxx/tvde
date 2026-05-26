from __future__ import annotations

from pydantic import BaseModel, Field


class PartnerMessageCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    body: str = Field(..., min_length=1, max_length=4000)
    priority: str = Field(default="normal", pattern="^(normal|high)$")
    driver_user_id: str | None = Field(
        default=None,
        description="Null = broadcast to entire fleet",
    )


class PartnerMessageItem(BaseModel):
    id: str
    title: str
    body: str
    priority: str
    created_at: str
    driver_user_id: str | None = None
    read: bool = False


class DriverMessageListItem(BaseModel):
    id: str
    title: str
    body: str
    priority: str
    created_at: str
    read: bool
