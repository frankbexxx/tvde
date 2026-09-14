#!/usr/bin/env python3
"""PORTAGENS F4 — minimal non-wipe seed for staging accounts.

STAGING ONLY. Refuses unless DATABASE_URL contains tvde_staging_db
(never run against PROD ride_db / tvde-api).

Reuses baseline partner UUIDs + seed_demo_vehicle_compliance patterns.
Password from TEST_ACCOUNT_PASSWORD / resolved_test_account_password() only.
Never prints passwords, hashes, DATABASE_URL, HERE keys, or JWTs.
No wipe, no migrations, no business-rule bypass.

Usage (Render one-off on tvde-staging-api):
  python scripts/ops/seed_f4_staging_min_accounts.py
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _ensure_app_path() -> None:
    candidates: list[Path] = []
    try:
        here = Path(__file__).resolve()
        candidates.extend([here.parents[0], here.parents[1], here.parents[2] / "backend"])
    except (NameError, IndexError):
        pass
    candidates.extend(
        [
            Path.cwd(),
            Path("/opt/render/project/src/backend"),
            Path("/opt/render/project/src"),
        ]
    )
    for candidate in candidates:
        try:
            if (candidate / "app").is_dir() and str(candidate) not in sys.path:
                sys.path.insert(0, str(candidate))
        except OSError:
            continue


_ensure_app_path()

PHONE_PASSENGER = "+351912345678"
PHONE_DRIVER = "+351911111111"
PHONE_PARTNER = "+351955555502"
PHONE_ADMIN = "+351900000000"


def _enum_val(v: Any) -> str:
    return getattr(v, "value", str(v))


def _user_snapshot(u: Any) -> dict[str, Any]:
    return {
        "exists": True,
        "phone": u.phone,
        "role": _enum_val(u.role),
        "status": _enum_val(u.status),
        "is_test_account": bool(u.is_test_account),
        "password_set": bool(u.password_hash),
        "id": str(u.id),
    }


def main() -> int:
    from sqlalchemy import select
    from sqlalchemy.orm import joinedload

    from app.auth.passwords import hash_password
    from app.core.config import settings
    from app.core.partner_constants import (
        BASELINE_PARTNER_FLEET_UUID,
        DEFAULT_PARTNER_UUID,
    )
    from app.db.models.driver import Driver, DriverLocation
    from app.db.models.partner import Partner
    from app.db.models.user import User
    from app.db.session import SessionLocal
    from app.models.enums import DriverStatus, Role, UserStatus
    from app.services.offer_dispatch import LOCATION_MAX_AGE_SECONDS
    from app.services.seed_demo_vehicle_compliance import (
        ensure_e2e_seed_driver_vehicle,
    )
    from app.services.vehicle_compliance_gate import (
        evaluate_driver_vehicle_compliance_gate,
        vehicle_compliance_gates_enabled,
    )

    db_url = (settings.DATABASE_URL or "").lower()
    if "tvde_staging_db" not in db_url:
        print(
            json.dumps(
                {
                    "error": "refused_non_staging_database",
                    "hint": "DATABASE_URL must contain tvde_staging_db",
                }
            )
        )
        return 2

    try:
        pwd = settings.resolved_test_account_password()
    except Exception:
        print(json.dumps({"error": "TEST_ACCOUNT_PASSWORD_missing"}))
        return 2

    pwd_hash = hash_password(pwd)
    now = datetime.now(timezone.utc)
    # Oeiras — BRISA smoke origin
    lat, lng = 38.6910, -9.3110

    report: dict[str, Any] = {
        "target_hint": "tvde-staging-api",
        "actions": [],
        "accounts": {},
        "driver_readiness": None,
        "stop": False,
        "stop_reason": None,
    }

    db = SessionLocal()
    try:
        # Partners (idempotent)
        for pid, name in (
            (DEFAULT_PARTNER_UUID, "Default fleet"),
            (BASELINE_PARTNER_FLEET_UUID, "test_partner"),
        ):
            if db.get(Partner, pid) is None:
                db.add(Partner(id=pid, name=name))
                report["actions"].append(f"created_partner:{name}")
        db.flush()

        # 1) Passenger — activate + password
        pax = db.execute(
            select(User).where(User.phone == PHONE_PASSENGER)
        ).scalar_one_or_none()
        if pax is None:
            pax = User(
                role=Role.passenger,
                name="test_passenger",
                phone=PHONE_PASSENGER,
                status=UserStatus.active,
                is_test_account=True,
                password_hash=pwd_hash,
            )
            db.add(pax)
            report["actions"].append("created_passenger")
        else:
            pax.role = Role.passenger
            pax.status = UserStatus.active
            pax.is_test_account = True
            pax.password_hash = pwd_hash
            report["actions"].append("updated_passenger")
        db.flush()

        # 2) Driver + profile + location
        drv_u = db.execute(
            select(User).where(User.phone == PHONE_DRIVER)
        ).scalar_one_or_none()
        if drv_u is None:
            drv_u = User(
                role=Role.driver,
                name="test_driver",
                phone=PHONE_DRIVER,
                status=UserStatus.active,
                is_test_account=True,
                password_hash=pwd_hash,
            )
            db.add(drv_u)
            db.flush()
            report["actions"].append("created_driver_user")
        else:
            drv_u.role = Role.driver
            drv_u.status = UserStatus.active
            drv_u.is_test_account = True
            drv_u.password_hash = pwd_hash
            report["actions"].append("updated_driver_user")

        drv = db.execute(
            select(Driver).where(Driver.user_id == drv_u.id)
        ).scalar_one_or_none()
        if drv is None:
            drv = Driver(
                user_id=drv_u.id,
                partner_id=BASELINE_PARTNER_FLEET_UUID,
                status=DriverStatus.approved,
                commission_percent=15.0,
                is_available=True,
            )
            db.add(drv)
            report["actions"].append("created_driver_profile")
        else:
            # Same fleet as Partner +351955555502 so Partner can see F4 trips.
            drv.partner_id = BASELINE_PARTNER_FLEET_UUID
            drv.status = DriverStatus.approved
            drv.is_available = True
            if drv.commission_percent is None:
                drv.commission_percent = 15.0
            report["actions"].append("updated_driver_profile")
        db.flush()

        loc = db.get(DriverLocation, drv_u.id)
        if loc is None:
            db.add(
                DriverLocation(
                    driver_id=drv_u.id, lat=lat, lng=lng, timestamp=now
                )
            )
            report["actions"].append("created_driver_location")
        else:
            loc.lat = lat
            loc.lng = lng
            loc.timestamp = now
            report["actions"].append("refreshed_driver_location")
        db.flush()

        # DEMO vehicle + real compliance docs on partner fleet (E2E pattern).
        vehicle = ensure_e2e_seed_driver_vehicle(db, drv)
        report["actions"].append("ensure_e2e_demo_vehicle_compliance")
        report["demo_vehicle"] = {
            "vehicle_id": str(vehicle.id),
            "plate": vehicle.plate,
            "status": vehicle.status,
            "partner_id": str(vehicle.partner_id),
        }
        db.flush()

        # 3) Partner (privileged: password hash, is_test_account=False)
        partner_u = db.execute(
            select(User).where(User.phone == PHONE_PARTNER)
        ).scalar_one_or_none()
        if partner_u is None:
            partner_u = User(
                role=Role.partner,
                name="test_partner",
                phone=PHONE_PARTNER,
                status=UserStatus.active,
                partner_org_id=BASELINE_PARTNER_FLEET_UUID,
                is_test_account=False,
                password_hash=pwd_hash,
            )
            db.add(partner_u)
            report["actions"].append("created_partner_user")
        else:
            partner_u.role = Role.partner
            partner_u.status = UserStatus.active
            partner_u.partner_org_id = BASELINE_PARTNER_FLEET_UUID
            partner_u.is_test_account = False
            partner_u.password_hash = pwd_hash
            report["actions"].append("updated_partner_user")
        db.flush()

        # 4) Admin (privileged)
        admin_u = db.execute(
            select(User).where(User.phone == PHONE_ADMIN)
        ).scalar_one_or_none()
        if admin_u is None:
            admin_u = User(
                role=Role.admin,
                name="dev_admin",
                phone=PHONE_ADMIN,
                status=UserStatus.active,
                is_test_account=False,
                password_hash=pwd_hash,
            )
            db.add(admin_u)
            report["actions"].append("created_admin_user")
        else:
            admin_u.role = Role.admin
            admin_u.status = UserStatus.active
            admin_u.is_test_account = False
            admin_u.password_hash = pwd_hash
            report["actions"].append("updated_admin_user")

        db.commit()

        # Refresh snapshots + driver readiness
        for label, phone in (
            ("passenger", PHONE_PASSENGER),
            ("driver", PHONE_DRIVER),
            ("partner", PHONE_PARTNER),
            ("admin", PHONE_ADMIN),
        ):
            u = db.execute(select(User).where(User.phone == phone)).scalar_one()
            report["accounts"][label] = _user_snapshot(u)

        drv = db.execute(
            select(Driver)
            .options(
                joinedload(Driver.active_vehicle),
                joinedload(Driver.last_location),
            )
            .where(Driver.user_id == drv_u.id)
        ).scalar_one()
        gate = evaluate_driver_vehicle_compliance_gate(db, drv)
        loc = drv.last_location
        age = None
        fresh = False
        if loc and loc.timestamp:
            ts = loc.timestamp
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            age = round((now - ts).total_seconds(), 1)
            fresh = age <= float(LOCATION_MAX_AGE_SECONDS)

        report["driver_readiness"] = {
            "approved": drv.status == DriverStatus.approved,
            "is_available": bool(drv.is_available),
            "has_vehicle": drv.active_vehicle_id is not None,
            "vehicle_plate": getattr(drv.active_vehicle, "plate", None)
            if drv.active_vehicle
            else None,
            "vehicle_status": getattr(drv.active_vehicle, "status", None)
            if drv.active_vehicle
            else None,
            "compliance_gates_enabled": vehicle_compliance_gates_enabled(),
            "compliance_allowed": bool(gate.allowed),
            "compliance_code": gate.code,
            "location_age_sec": age,
            "location_fresh": fresh,
        }

        if not (
            report["driver_readiness"]["approved"]
            and report["driver_readiness"]["has_vehicle"]
            and report["driver_readiness"]["compliance_allowed"]
            and report["driver_readiness"]["is_available"]
            and report["driver_readiness"]["location_fresh"]
        ):
            report["stop"] = True
            report["stop_reason"] = "driver_not_ready_after_seed"

        print(json.dumps(report, indent=2, default=str))
        return 1 if report["stop"] else 0
    except Exception as e:
        db.rollback()
        print(
            json.dumps(
                {
                    "error": "seed_failed",
                    "type": type(e).__name__,
                    "message": str(e)[:300],
                }
            )
        )
        return 2
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
