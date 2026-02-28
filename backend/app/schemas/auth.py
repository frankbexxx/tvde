from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import Role


class OtpRequest(BaseModel):
    phone: str = Field(..., min_length=6, max_length=32)


class OtpRequestResponse(BaseModel):
    request_id: str
    expires_at: datetime


class OtpVerifyRequest(BaseModel):
    phone: str = Field(..., min_length=6, max_length=32)
    code: str = Field(..., min_length=4, max_length=8)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    role: Role
    expires_at: datetime

