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
        description="BETA: passenger or driver (só usado ao criar novo utilizador pendente).",
    )


class LoginRequest(BaseModel):
    """BETA: login with phone + default password."""

    phone: str = Field(..., min_length=6, max_length=32)
    password: str = Field(..., min_length=1)
    requested_role: str | None = Field(
        None,
        description="BETA: passenger or driver (só usado ao criar novo utilizador pendente).",
    )


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    role: Role
    expires_at: datetime
    display_name: str = Field(
        default="",
        description="Snapshot de User.name na emissão do token (BETA / OTP).",
    )


class PasswordChangeRequest(BaseModel):
    """Alterar palavra-passe autenticado. Se já existe hash, current_password é obrigatório."""

    current_password: str | None = Field(None, min_length=1, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)


class MeProfileResponse(BaseModel):
    """Perfil mínimo do utilizador autenticado (BETA)."""

    user_id: str
    phone: str
    name: str
    has_custom_password: bool


class MeProfilePatchRequest(BaseModel):
    """M1: o próprio utilizador altera o nome visível; telefone continua só via admin."""

    name: str = Field(..., min_length=1, max_length=120)
