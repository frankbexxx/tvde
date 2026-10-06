from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_db, require_role
from app.db.models.user import User
from app.models.enums import Role
from app.schemas.passenger_payment import (
    PaymentMethodListResponse,
    PaymentMethodResponse,
    RegisterPaymentMethodRequest,
    SetupIntentResponse,
)
from app.services import passenger_payments as wallet

router = APIRouter(prefix="/payments", tags=["payments"])


def _user_row(db: Session, user: UserContext) -> User:
    row = db.get(User, uuid.UUID(user.user_id))
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    return row


@router.post("/setup-intent", response_model=SetupIntentResponse)
async def post_setup_intent(
    user: UserContext = Depends(require_role(Role.passenger)),
    db: Session = Depends(get_db),
) -> SetupIntentResponse:
    row = _user_row(db, user)
    data = wallet.create_passenger_setup_intent(db, row)
    return SetupIntentResponse(**data)


@router.get("/methods", response_model=PaymentMethodListResponse)
async def get_methods(
    user: UserContext = Depends(require_role(Role.passenger)),
    db: Session = Depends(get_db),
) -> PaymentMethodListResponse:
    row = _user_row(db, user)
    methods = wallet.list_payment_methods(db, row)
    return PaymentMethodListResponse(
        methods=[PaymentMethodResponse(**m) for m in methods]
    )


@router.get("/methods/default", response_model=PaymentMethodResponse)
async def get_default_method(
    user: UserContext = Depends(require_role(Role.passenger)),
    db: Session = Depends(get_db),
) -> PaymentMethodResponse:
    from fastapi import HTTPException, status

    row = _user_row(db, user)
    default = wallet.get_default_payment_method(db, row)
    if default is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="payment_method_required",
        )
    return PaymentMethodResponse(
        id=str(default.id),
        payment_method_id=default.stripe_payment_method_id,
        brand=default.brand,
        last4=default.last4,
        exp_month=default.exp_month,
        exp_year=default.exp_year,
        is_default=bool(default.is_default),
    )


@router.post("/methods", response_model=PaymentMethodResponse)
async def post_register_method(
    payload: RegisterPaymentMethodRequest,
    user: UserContext = Depends(require_role(Role.passenger)),
    db: Session = Depends(get_db),
) -> PaymentMethodResponse:
    row = _user_row(db, user)
    data = wallet.register_payment_method_from_setup_intent(
        db, row, setup_intent_id=payload.setup_intent_id
    )
    return PaymentMethodResponse(**data)


@router.post("/methods/{method_id}/default", response_model=PaymentMethodResponse)
async def post_set_default(
    method_id: str,
    user: UserContext = Depends(require_role(Role.passenger)),
    db: Session = Depends(get_db),
) -> PaymentMethodResponse:
    row = _user_row(db, user)
    data = wallet.set_default_payment_method(db, row, method_row_id=method_id)
    return PaymentMethodResponse(**data)


@router.delete("/methods/{method_id}", status_code=204)
async def delete_method(
    method_id: str,
    user: UserContext = Depends(require_role(Role.passenger)),
    db: Session = Depends(get_db),
) -> None:
    row = _user_row(db, user)
    wallet.detach_passenger_payment_method(db, row, method_row_id=method_id)
