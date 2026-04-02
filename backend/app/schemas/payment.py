from pydantic import BaseModel

from app.models.enums import PaymentStatus


class PaymentStatusResponse(BaseModel):
    trip_id: str
    status: PaymentStatus
