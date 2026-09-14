#!/usr/bin/env python3
"""PORTAGENS F4 — prepare staging test accounts (safe, no secret output).

Run ONLY on tvde-staging-api (Render one-off job / SSH). Reads
TEST_ACCOUNT_PASSWORD from service env. Never prints passwords, hashes,
DATABASE_URL, HERE_API_KEY, or JWTs.

Usage (on staging runtime):
  python scripts/ops/prepare_f4_staging_accounts.py
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Allow imports when run as file or via exec()/one-off job.
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

PHONES = {
    "passenger": "+351912345678",
    "driver": "+351911111111",
    "partner": "+351955555502",
    "admin": "+351900000000",
}


def _enum_val(v: Any) -> str:
    return getattr(v, "value", str(v))


def main() -> int:
    from sqlalchemy import select
    from sqlalchemy.orm import joinedload

    from app.auth.passwords import hash_password
    from app.core.config import settings
    from app.db.models.driver import Driver, DriverLocation
    from app.db.models.user import User
    from app.db.session import SessionLocal
    from app.models.enums import DriverStatus, Role, UserStatus
    from app.services.offer_dispatch import LOCATION_MAX_AGE_SECONDS
    from app.services.vehicle_compliance_gate import (
        evaluate_driver_vehicle_compliance_gate,
        vehicle_compliance_gates_enabled,
    )

    # Hard safety: only staging DB name confirmed by Frank.
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

    pwd = settings.TEST_ACCOUNT_PASSWORD
    if not pwd or not str(pwd).strip():
        print(json.dumps({"error": "TEST_ACCOUNT_PASSWORD_missing"}))
        return 2

    privileged = {Role.admin, Role.super_admin, Role.partner}
    now = datetime.now(timezone.utc)
    report: dict[str, Any] = {
        "target_hint": "tvde-staging-api",
        "accounts": {},
        "missing": [],
        "passwords_reset": [],
        "driver_readiness": None,
        "stop": False,
        "stop_reason": None,
    }

    db = SessionLocal()
    try:
        for label, phone in PHONES.items():
            u = db.execute(select(User).where(User.phone == phone)).scalar_one_or_none()
            if not u:
                report["missing"].append({"label": label, "phone": phone})
                report["accounts"][label] = {"exists": False, "phone": phone}
                continue

            row: dict[str, Any] = {
                "exists": True,
                "phone": phone,
                "role": _enum_val(u.role),
                "status": _enum_val(u.status),
                "is_test_account": bool(u.is_test_account),
                "password_set": bool(u.password_hash),
            }

            if u.role == Role.driver:
                d = db.execute(
                    select(Driver)
                    .options(
                        joinedload(Driver.active_vehicle),
                        joinedload(Driver.last_location),
                    )
                    .where(Driver.user_id == u.id)
                ).scalar_one_or_none()
                if not d:
                    row["driver"] = None
                else:
                    loc = d.last_location
                    age = None
                    fresh = False
                    if loc and loc.timestamp:
                        ts = loc.timestamp
                        if ts.tzinfo is None:
                            ts = ts.replace(tzinfo=timezone.utc)
                        age = round((now - ts).total_seconds(), 1)
                        fresh = age <= float(LOCATION_MAX_AGE_SECONDS)
                    gate = evaluate_driver_vehicle_compliance_gate(db, d)
                    row["driver"] = {
                        "driver_status": _enum_val(d.status),
                        "approved": d.status == DriverStatus.approved,
                        "is_available": bool(d.is_available),
                        "active_vehicle_id": str(d.active_vehicle_id)
                        if d.active_vehicle_id
                        else None,
                        "vehicle_plate": getattr(d.active_vehicle, "plate", None)
                        if d.active_vehicle
                        else None,
                        "has_location": loc is not None,
                        "location_age_sec": age,
                        "location_fresh": fresh,
                        "compliance_gates_enabled": vehicle_compliance_gates_enabled(),
                        "compliance_allowed": bool(gate.allowed),
                        "compliance_code": gate.code,
                    }
            report["accounts"][label] = row

        # Required for F4 smokes: passenger + driver must exist
        need = {"passenger", "driver"}
        missing_need = [m for m in report["missing"] if m["label"] in need]
        if missing_need:
            report["stop"] = True
            report["stop_reason"] = "missing_required_accounts"
            print(json.dumps(report, indent=2, default=str))
            return 1

        # Password reset for existing accounts only
        h = hash_password(str(pwd).strip())
        for label, phone in PHONES.items():
            u = db.execute(select(User).where(User.phone == phone)).scalar_one_or_none()
            if not u:
                continue
            u.password_hash = h
            if u.role in privileged:
                u.is_test_account = False
            else:
                u.is_test_account = True
            if u.status != UserStatus.active:
                # do not auto-approve pending privileged; only note
                report["accounts"][label]["status_before_password"] = _enum_val(u.status)
            report["passwords_reset"].append(label)
        db.commit()

        # Driver readiness — auto-fix only availability + fresh location
        drv_phone = PHONES["driver"]
        drv_u = db.execute(select(User).where(User.phone == drv_phone)).scalar_one_or_none()
        d = db.execute(
            select(Driver)
            .options(joinedload(Driver.active_vehicle), joinedload(Driver.last_location))
            .where(Driver.user_id == drv_u.id)
        ).scalar_one_or_none()

        readiness: dict[str, Any] = {"driver_row_exists": bool(d)}
        if not d:
            report["stop"] = True
            report["stop_reason"] = "driver_profile_missing"
            report["driver_readiness"] = readiness
            print(json.dumps(report, indent=2, default=str))
            return 1

        gate = evaluate_driver_vehicle_compliance_gate(db, d)
        readiness.update(
            {
                "approved": d.status == DriverStatus.approved,
                "has_vehicle": d.active_vehicle_id is not None,
                "compliance_allowed": bool(gate.allowed),
                "compliance_code": gate.code,
                "is_available_before": bool(d.is_available),
            }
        )

        structural_ok = (
            readiness["approved"]
            and readiness["has_vehicle"]
            and readiness["compliance_allowed"]
        )
        if not structural_ok:
            report["stop"] = True
            report["stop_reason"] = "driver_structural_not_ready"
            report["driver_readiness"] = readiness
            print(json.dumps(report, indent=2, default=str))
            return 1

        # Minimal ops fix
        d.is_available = True
        loc = d.last_location
        # Oeiras centroid — near BRISA smoke origin
        lat, lng = 38.6910, -9.3110
        if loc is None:
            db.add(
                DriverLocation(
                    driver_id=d.user_id,
                    lat=lat,
                    lng=lng,
                    timestamp=now,
                )
            )
            readiness["location_action"] = "created"
        else:
            loc.lat = lat
            loc.lng = lng
            loc.timestamp = now
            readiness["location_action"] = "refreshed"
        db.commit()
        readiness["is_available"] = True
        readiness["location_fresh"] = True
        readiness["action"] = "SET_AVAILABLE_AND_FRESH_LOCATION"
        report["driver_readiness"] = readiness

        print(json.dumps(report, indent=2, default=str))
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
