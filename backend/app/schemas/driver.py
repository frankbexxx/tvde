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
        ...,
        description=(
            "Milliseconds since epoch. Without X-Gps-Contract this is a legacy client "
            "clock (±1 hour). With X-Gps-Contract: fix-v1 it is the GPS fix time. "
            "Both contracts ignore an older or equal timestamp and still return 204."
        ),
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
