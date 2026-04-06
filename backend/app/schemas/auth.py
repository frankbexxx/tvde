from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import Role


class OtpRequest(BaseModel):
    phone: str = Field(..., min_length=6, max_length=32)
    requested_role: str | None = Field(None, description="BETA: passenger or driver")


class OtpRequestResponse(BaseModel):
    request_id: str
    expires_at: datetime


class OtpVerifyRequest(BaseModel):
    phone: str = Field(..., min_length=6, max_length=32)
    code: str = Field(..., min_length=4, max_length=8)
    requested_role: str | None = Field(
        None,
        description=(
            "BETA: passenger or driver (novo utilizador). "
            "Valor 'admin' só é aceite se o phone coincidir com ADMIN_PHONE no .env; "
            "após verify o role na resposta vem da BD (admin para esse telefone)."
        ),
    )


class LoginRequest(BaseModel):
    """BETA: login with phone + default password."""

    phone: str = Field(..., min_length=6, max_length=32)
    password: str = Field(..., min_length=1)
    requested_role: str | None = Field(None, description="passenger or driver")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    role: Role
    expires_at: datetime
