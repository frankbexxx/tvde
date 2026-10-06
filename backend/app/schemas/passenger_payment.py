from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class SetupIntentResponse(BaseModel):
    customer_id: str
    setup_intent_id: str
    client_secret: str


class RegisterPaymentMethodRequest(BaseModel):
    """Only a succeeded SetupIntent for this passenger's Customer is accepted."""

    setup_intent_id: str = Field(..., min_length=3, max_length=128)


class PaymentMethodResponse(BaseModel):
    id: str
    payment_method_id: str
    brand: str
    last4: str
    exp_month: Optional[int] = None
    exp_year: Optional[int] = None
    is_default: bool


class PaymentMethodListResponse(BaseModel):
    methods: list[PaymentMethodResponse]
