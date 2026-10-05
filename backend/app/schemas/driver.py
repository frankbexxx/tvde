from pydantic import BaseModel, Field

from app.models.enums import DriverStatus


class DriverStatusResponse(BaseModel):
    driver_id: str
    status: DriverStatus


class AdminDriverRejectBody(BaseModel):
    """Motivo obrigatório ao rejeitar perfil motorista (Admin Dados)."""

    reason: str = Field(
        ...,
        min_length=10,
        max_length=500,
        description="Motivo da rejeição (explicação útil; fica no registo de auditoria).",
    )


class DriverLocationPayload(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)
    timestamp: int = Field(
        ..., description="Client-side timestamp in milliseconds since epoch."
    )


class DriverLocationResponse(BaseModel):
    lat: float
    lng: float
    timestamp: int


class DriverVehicleCategoriesPayload(BaseModel):
    categories: list[str] = Field(
        ...,
        description="Categorias ativas para o motorista (x, xl, pet, comfort, black, electric, van).",
    )


class DriverVehicleCategoriesResponse(BaseModel):
    categories: list[str]
