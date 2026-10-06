"""Passenger Stripe wallet: Customer, SetupIntent, saved PaymentMethods."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.passenger_payment_method import PassengerPaymentMethod
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.db.models.user import User
from app.models.enums import TripStatus
from app.services.stripe_service import (
    create_customer,
    create_setup_intent,
    detach_payment_method,
    retrieve_customer,
    retrieve_payment_method,
    retrieve_setup_intent,
    set_customer_default_payment_method,
)

# Trips where a PaymentIntent may hold a PaymentMethod (detach forbidden).
_ACTIVE_PM_TRIP_STATUSES = (
    TripStatus.accepted,
    TripStatus.arriving,
    TripStatus.ongoing,
    TripStatus.assigned,
)


def _stripe_mock() -> bool:
    return bool(getattr(settings, "STRIPE_MOCK", False))


def _pm_id_from_obj(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        return value.strip() or None
    pid = getattr(value, "id", None)
    if isinstance(pid, str) and pid.strip():
        return pid.strip()
    if isinstance(value, dict):
        raw = value.get("id")
        return str(raw).strip() if raw else None
    return None


def _customer_id_from_obj(value: Any) -> str | None:
    return _pm_id_from_obj(value)


def ensure_stripe_customer(db: Session, user: User) -> str:
    """Lazy idempotent Customer create; persist users.stripe_customer_id."""
    existing = (user.stripe_customer_id or "").strip()
    if existing:
        return existing

    if _stripe_mock():
        cus_id = f"cus_mock_{str(user.id).replace('-', '')[:24]}"
        user.stripe_customer_id = cus_id
        db.add(user)
        db.commit()
        db.refresh(user)
        return cus_id

    try:
        customer = create_customer(
            email=user.email,
            name=user.name,
            metadata={"user_id": str(user.id)},
            idempotency_key=f"tvde-cus-{user.id}",
        )
        cus_id = customer.id
    except Exception as e:
        db.refresh(user)
        if (user.stripe_customer_id or "").strip():
            return user.stripe_customer_id.strip()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="stripe_customer_create_failed",
        ) from e

    user.stripe_customer_id = cus_id
    db.add(user)
    try:
        db.commit()
    except Exception:
        db.rollback()
        db.refresh(user)
        if (user.stripe_customer_id or "").strip():
            return user.stripe_customer_id.strip()
        raise
    db.refresh(user)
    return cus_id


def create_passenger_setup_intent(db: Session, user: User) -> dict[str, str]:
    cus_id = ensure_stripe_customer(db, user)
    if _stripe_mock():
        seti = f"seti_mock_{uuid.uuid4().hex[:20]}"
        return {
            "customer_id": cus_id,
            "setup_intent_id": seti,
            "client_secret": f"{seti}_secret_mock",
        }
    try:
        intent = create_setup_intent(
            customer_id=cus_id,
            metadata={"user_id": str(user.id)},
            idempotency_key=None,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="stripe_setup_intent_failed",
        ) from e
    secret = getattr(intent, "client_secret", None) or ""
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="stripe_setup_intent_failed",
        )
    return {
        "customer_id": cus_id,
        "setup_intent_id": intent.id,
        "client_secret": secret,
    }


def _card_fields_from_pm(pm: Any) -> tuple[str, str, int | None, int | None]:
    card = getattr(pm, "card", None)
    if card is None and isinstance(pm, dict):
        card = pm.get("card") or {}
    if card is None:
        return "card", "0000", None, None
    brand = (getattr(card, "brand", None) or (card.get("brand") if isinstance(card, dict) else None) or "card")
    last4 = (getattr(card, "last4", None) or (card.get("last4") if isinstance(card, dict) else None) or "0000")
    exp_month = getattr(card, "exp_month", None) or (
        card.get("exp_month") if isinstance(card, dict) else None
    )
    exp_year = getattr(card, "exp_year", None) or (
        card.get("exp_year") if isinstance(card, dict) else None
    )
    return str(brand), str(last4)[:4], exp_month, exp_year


def _clear_defaults(db: Session, user_id: uuid.UUID) -> None:
    rows = db.execute(
        select(PassengerPaymentMethod).where(PassengerPaymentMethod.user_id == user_id)
    ).scalars().all()
    for row in rows:
        if row.is_default:
            row.is_default = False
            db.add(row)


def _serialize(row: PassengerPaymentMethod) -> dict:
    return {
        "id": str(row.id),
        "payment_method_id": row.stripe_payment_method_id,
        "brand": row.brand,
        "last4": row.last4,
        "exp_month": row.exp_month,
        "exp_year": row.exp_year,
        "is_default": bool(row.is_default),
    }


def _db_default_only(
    db: Session, user: User
) -> PassengerPaymentMethod | None:
    """Cache-only default (used by mock and internal writes)."""
    return db.execute(
        select(PassengerPaymentMethod).where(
            PassengerPaymentMethod.user_id == user.id,
            PassengerPaymentMethod.is_default.is_(True),
        )
    ).scalar_one_or_none()


def _stripe_customer_default_pm_id(customer: Any) -> str | None:
    inv = getattr(customer, "invoice_settings", None)
    if inv is None and isinstance(customer, dict):
        inv = customer.get("invoice_settings")
    if inv is None:
        return None
    raw = getattr(inv, "default_payment_method", None)
    if raw is None and isinstance(inv, dict):
        raw = inv.get("default_payment_method")
    return _pm_id_from_obj(raw)


def reconcile_default_payment_method_from_stripe(
    db: Session, user: User
) -> PassengerPaymentMethod | None:
    """
    Live only: Stripe Customer.invoice_settings.default_payment_method is authority.
    Aligns DB cache (is_default / upsert missing PM metadata). Mock callers must not use this.
    """
    cus_id = (user.stripe_customer_id or "").strip()
    if not cus_id:
        return None

    try:
        customer = retrieve_customer(cus_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="stripe_customer_retrieve_failed",
        ) from e

    stripe_pm_id = _stripe_customer_default_pm_id(customer)
    if not stripe_pm_id:
        _clear_defaults(db, user.id)
        db.commit()
        return None

    row = db.execute(
        select(PassengerPaymentMethod).where(
            PassengerPaymentMethod.user_id == user.id,
            PassengerPaymentMethod.stripe_payment_method_id == stripe_pm_id,
        )
    ).scalar_one_or_none()

    if row is None:
        try:
            pm = retrieve_payment_method(stripe_pm_id)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="stripe_payment_method_retrieve_failed",
            ) from e
        pm_customer = _customer_id_from_obj(getattr(pm, "customer", None))
        if pm_customer and pm_customer != cus_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="payment_method_customer_mismatch",
            )
        brand, last4, exp_month, exp_year = _card_fields_from_pm(pm)
        row = PassengerPaymentMethod(
            user_id=user.id,
            stripe_payment_method_id=stripe_pm_id,
            brand=brand,
            last4=last4,
            exp_month=exp_month,
            exp_year=exp_year,
            is_default=False,
        )
        db.add(row)
        db.flush()

    if not row.is_default:
        _clear_defaults(db, user.id)
        row.is_default = True
        db.add(row)

    db.commit()
    db.refresh(row)
    return row


def list_payment_methods(db: Session, user: User) -> list[dict]:
    if not _stripe_mock():
        reconcile_default_payment_method_from_stripe(db, user)
    rows = db.execute(
        select(PassengerPaymentMethod)
        .where(PassengerPaymentMethod.user_id == user.id)
        .order_by(
            PassengerPaymentMethod.is_default.desc(),
            PassengerPaymentMethod.created_at.asc(),
        )
    ).scalars().all()
    return [_serialize(r) for r in rows]


def get_default_payment_method(
    db: Session, user: User
) -> PassengerPaymentMethod | None:
    """
    Mock: DB cache only.
    Live: reconcile from Stripe Customer default, then return aligned cache row.
    """
    if _stripe_mock():
        return _db_default_only(db, user)
    return reconcile_default_payment_method_from_stripe(db, user)


def assert_passenger_ready_for_trip(db: Session, user: User) -> None:
    """Gate POST /trips when Stripe is live. Mock does not block."""
    if _stripe_mock():
        return
    if not (user.stripe_customer_id or "").strip():
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="payment_method_required",
        )
    if get_default_payment_method(db, user) is None:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="payment_method_required",
        )


def register_payment_method_from_setup_intent(
    db: Session,
    user: User,
    *,
    setup_intent_id: str,
) -> dict:
    """
    Register PM only after a succeeded SetupIntent owned by this user's Customer.
    Rejects arbitrary PMs or PMs belonging to another Customer.
    """
    seti_id = (setup_intent_id or "").strip()
    if not seti_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_setup_intent",
        )

    cus_id = ensure_stripe_customer(db, user)

    if _stripe_mock():
        if not seti_id.startswith("seti_mock_"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="invalid_setup_intent",
            )
        pm_id = f"pm_mock_{uuid.uuid4().hex[:16]}"
        brand, last4, exp_month, exp_year = "visa", "4242", 12, 2030
    else:
        try:
            si = retrieve_setup_intent(seti_id)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="invalid_setup_intent",
            ) from e

        si_status = getattr(si, "status", None)
        if si_status != "succeeded":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="setup_intent_not_succeeded",
            )

        si_customer = _customer_id_from_obj(getattr(si, "customer", None))
        if not si_customer or si_customer != cus_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="setup_intent_customer_mismatch",
            )

        pm_id = _pm_id_from_obj(getattr(si, "payment_method", None))
        if not pm_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="setup_intent_missing_payment_method",
            )

        try:
            pm = retrieve_payment_method(pm_id)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="invalid_payment_method",
            ) from e

        pm_customer = _customer_id_from_obj(getattr(pm, "customer", None))
        if not pm_customer or pm_customer != cus_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="payment_method_customer_mismatch",
            )

        brand, last4, exp_month, exp_year = _card_fields_from_pm(pm)

    existing = db.execute(
        select(PassengerPaymentMethod).where(
            PassengerPaymentMethod.stripe_payment_method_id == pm_id
        )
    ).scalar_one_or_none()
    if existing and existing.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="payment_method_customer_mismatch",
        )

    make_default = _db_default_only(db, user) is None
    if existing:
        row = existing
        row.brand = brand
        row.last4 = last4
        row.exp_month = exp_month
        row.exp_year = exp_year
    else:
        row = PassengerPaymentMethod(
            user_id=user.id,
            stripe_payment_method_id=pm_id,
            brand=brand,
            last4=last4,
            exp_month=exp_month,
            exp_year=exp_year,
            is_default=False,
        )
        db.add(row)

    if make_default or row.is_default:
        _apply_default(db, user, row)

    db.commit()
    db.refresh(row)
    return _serialize(row)


def _apply_default(
    db: Session, user: User, row: PassengerPaymentMethod
) -> None:
    """Stripe is authority when live: sync Stripe first, then DB cache."""
    cus_id = (user.stripe_customer_id or "").strip()
    if not cus_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="stripe_customer_required",
        )

    if not _stripe_mock():
        try:
            set_customer_default_payment_method(
                cus_id, row.stripe_payment_method_id
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="stripe_set_default_failed",
            ) from e

    _clear_defaults(db, user.id)
    row.is_default = True
    db.add(row)


def set_default_payment_method(
    db: Session, user: User, *, method_row_id: str
) -> dict:
    try:
        rid = uuid.UUID(method_row_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="payment_method_not_found",
        ) from e

    row = db.execute(
        select(PassengerPaymentMethod).where(
            PassengerPaymentMethod.id == rid,
            PassengerPaymentMethod.user_id == user.id,
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="payment_method_not_found",
        )

    _apply_default(db, user, row)
    db.commit()
    db.refresh(row)
    return _serialize(row)


def _pm_in_use_on_active_trip(db: Session, user: User, pm_id: str) -> bool:
    rows = db.execute(
        select(Payment.stripe_payment_method_id)
        .join(Trip, Trip.id == Payment.trip_id)
        .where(
            Trip.passenger_id == user.id,
            Trip.status.in_(_ACTIVE_PM_TRIP_STATUSES),
            Payment.stripe_payment_method_id == pm_id,
        )
    ).all()
    return len(rows) > 0


def detach_passenger_payment_method(
    db: Session, user: User, *, method_row_id: str
) -> None:
    try:
        rid = uuid.UUID(method_row_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="payment_method_not_found",
        ) from e

    row = db.execute(
        select(PassengerPaymentMethod).where(
            PassengerPaymentMethod.id == rid,
            PassengerPaymentMethod.user_id == user.id,
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="payment_method_not_found",
        )

    if _pm_in_use_on_active_trip(db, user, row.stripe_payment_method_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="payment_method_in_use",
        )

    was_default = bool(row.is_default)
    pm_stripe_id = row.stripe_payment_method_id

    if not _stripe_mock() and not pm_stripe_id.startswith("pm_mock_"):
        try:
            detach_payment_method(pm_stripe_id)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="stripe_detach_failed",
            ) from e

    db.delete(row)
    db.flush()

    if was_default:
        nxt = db.execute(
            select(PassengerPaymentMethod)
            .where(PassengerPaymentMethod.user_id == user.id)
            .order_by(PassengerPaymentMethod.created_at.asc())
        ).scalars().first()
        if nxt is not None:
            _apply_default(db, user, nxt)

    db.commit()


def resolve_default_pm_for_accept(
    db: Session, passenger_id: str
) -> tuple[str | None, str | None]:
    """Return (customer_id, payment_method_id) for accept PI binding."""
    user = db.get(User, uuid.UUID(passenger_id))
    if user is None:
        return None, None
    cus = (user.stripe_customer_id or "").strip() or None
    default = get_default_payment_method(db, user)
    pm = default.stripe_payment_method_id if default else None
    return cus, pm
