"""
Full wipe of application tables + deterministic baseline users (dev / CLI).

Does not touch ``alembic_version``. Safe to run against an empty DB (TRUNCATE no-op on empty).
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.core.partner_constants import (
    BASELINE_PARTNER_FLEET_UUID,
    DEFAULT_PARTNER_UUID,
)
from app.auth.passwords import hash_password
from app.core.config import settings
from app.db.models.driver import Driver, DriverLocation
from app.db.models.partner import Partner
from app.db.models.user import User
from app.models.enums import DriverStatus, Role, UserStatus

BASELINE_USERS: Sequence[tuple[str, Role, str]] = (
    ("+351911111111", Role.driver, "test_driver"),
    ("+351912345678", Role.passenger, "test_passenger"),
    ("+351924075365", Role.super_admin, "frank"),
    ("+351955555502", Role.partner, "test_partner"),
    ("+351938874006", Role.passenger, "Kenia"),
    ("+351918304615", Role.driver, "Marly"),
    ("+351918870365", Role.passenger, "Jeff"),
    ("+351967330628", Role.passenger, "Maria João"),
    ("+351939694569", Role.driver, "Manel Perez"),
    ("+351900000000", Role.admin, "dev_admin"),
)

_SHARED_TEST_ACCOUNT_ROLES = frozenset({Role.driver, Role.passenger})

_TRIP_EVENT_TABLES = (
    "stripe_webhook_events",
    "audit_events",
    "interaction_logs",
    "trip_offers",
    "payments",
    "trips",
    "driver_zone_sessions",
    "driver_zone_day_budgets",
    "driver_zone_customs",
    "driver_locations",
    "drivers",
    "otp_codes",
    "users",
    "partners",
)


def wipe_all_application_data(db: Session) -> None:
    """Remove all rows from ride-hailing tables; preserve schema + Alembic revision."""
    tables = ", ".join(_TRIP_EVENT_TABLES)
    db.execute(text(f"TRUNCATE TABLE {tables} CASCADE"))
    db.commit()


def _default_lisbon_coords() -> tuple[float, float]:
    return 38.720000, -9.140000


def _is_shared_test_seed_account(phone: str, role: Role | None) -> bool:
    if settings.is_owner_phone(phone):
        return False
    if role is None:
        return True
    return role in _SHARED_TEST_ACCOUNT_ROLES


def validate_baseline_seed_config() -> None:
    """Fail before destructive reset work if seed credentials are incomplete."""
    needs_test_password = any(
        _is_shared_test_seed_account(phone, role) for phone, role, _ in BASELINE_USERS
    )
    if needs_test_password:
        settings.resolved_test_account_password()


def seed_user_auth_fields(phone: str, role: Role | None = None) -> dict[str, object]:
    """Only passenger/driver demo accounts get the shared test password."""
    is_test = _is_shared_test_seed_account(phone, role)
    fields: dict[str, object] = {"is_test_account": is_test}
    if is_test:
        fields["password_hash"] = hash_password(settings.resolved_test_account_password())
    return fields


def seed_baseline_users(db: Session) -> dict[str, Any]:
    """
    After ``wipe_all_application_data``, insert Default fleet + baseline partner org and users.
    """
    validate_baseline_seed_config()
    now = datetime.now(timezone.utc)
    lat, lng = _default_lisbon_coords()

    db.add_all(
        [
            Partner(id=DEFAULT_PARTNER_UUID, name="Default fleet"),
            Partner(id=BASELINE_PARTNER_FLEET_UUID, name="test_partner"),
        ]
    )
    db.flush()

    phone_to_id: dict[str, uuid.UUID] = {}
    for phone, role, name in BASELINE_USERS:
        partner_org: uuid.UUID | None = None
        if role == Role.partner and phone == "+351955555502":
            partner_org = BASELINE_PARTNER_FLEET_UUID
        user = User(
            role=role,
            name=name,
            phone=phone,
            status=UserStatus.active,
            partner_org_id=partner_org,
            **seed_user_auth_fields(phone, role),
        )
        db.add(user)
        db.flush()
        phone_to_id[phone] = user.id

    default_pool_drivers = ("+351911111111",)
    partner_fleet_drivers = ("+351918304615", "+351939694569")

    for phone in default_pool_drivers:
        uid = phone_to_id[phone]
        db.add(
            Driver(
                user_id=uid,
                partner_id=DEFAULT_PARTNER_UUID,
                status=DriverStatus.approved,
                commission_percent=15.0,
                is_available=True,
            )
        )
        db.add(
            DriverLocation(driver_id=uid, lat=lat, lng=lng, timestamp=now),
        )

    for phone in partner_fleet_drivers:
        uid = phone_to_id[phone]
        db.add(
            Driver(
                user_id=uid,
                partner_id=BASELINE_PARTNER_FLEET_UUID,
                status=DriverStatus.approved,
                commission_percent=15.0,
                is_available=True,
            )
        )
        db.add(
            DriverLocation(driver_id=uid, lat=lat, lng=lng, timestamp=now),
        )

    db.commit()

    out_users = {
        phone: {"id": str(uid), "role": next(r for p, r, _ in BASELINE_USERS if p == phone).value}
        for phone, uid in phone_to_id.items()
    }
    return {
        "partners": {
            "default_fleet": str(DEFAULT_PARTNER_UUID),
            "test_partner_fleet": str(BASELINE_PARTNER_FLEET_UUID),
        },
        "users": out_users,
    }


def run_full_baseline_reset(db: Session) -> dict[str, Any]:
    validate_baseline_seed_config()
    wipe_all_application_data(db)
    return seed_baseline_users(db)


def baseline_user_count_expected() -> int:
    return len(BASELINE_USERS)


def assert_baseline_state(db: Session) -> None:
    """Lightweight check after reset (optional)."""
    n_users = db.execute(select(User.id)).all()
    n_partners = db.execute(select(Partner.id)).all()
    n_drivers = db.execute(select(Driver.user_id)).all()
    if len(n_users) != len(BASELINE_USERS):
        raise RuntimeError(f"baseline users expected {len(BASELINE_USERS)}, got {len(n_users)}")
    if len(n_partners) != 2:
        raise RuntimeError(f"expected 2 partners, got {len(n_partners)}")
    if len(n_drivers) != 3:
        raise RuntimeError(f"expected 3 drivers, got {len(n_drivers)}")
