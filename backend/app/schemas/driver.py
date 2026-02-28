from pydantic import BaseModel

from app.models.enums import DriverStatus


class DriverStatusResponse(BaseModel):
    driver_id: str
    status: DriverStatus

