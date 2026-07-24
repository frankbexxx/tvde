#!/usr/bin/env python3
"""PF3D-AUDIT-1 — Read-only impact audit for future vehicle document gates.

Does **not** enable gates, write to the DB, mutate state, or print secrets.

Run (local Postgres recommended)::

    cd backend
    $env:DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/test_db'
    python ../scripts/audit_vehicle_document_compliance.py

Or from repo root with backend on PYTHONPATH / local env already set::

    python scripts/audit_vehicle_document_compliance.py

Remote / non-local hosts are refused unless ``ALLOW_REMOTE_AUDIT_DB=YES``.
Never prints DATABASE_URL, passwords, or tokens — only hostname.
"""

from __future__ import annotations

import os
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

_REPO_ROOT = Path(__file__).resolve().parents[1]
_BACKEND_ROOT = _REPO_ROOT / "backend"
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

_LOCAL_HOSTS = frozenset({"localhost", "127.0.0.1", "::1"})
_EXAMPLE_LIMIT = 8


class ReadOnlyAuditError(RuntimeError):
    """Raised if the audit session attempts a write."""


def _database_hostname(url: str) -> str:
    normalized = url.strip()
    normalized = normalized.replace("postgresql+psycopg2://", "postgresql://", 1)
    normalized = normalized.replace("postgres+psycopg2://", "postgres://", 1)
    if "@::1:" in normalized or "@::1/" in normalized or normalized.startswith(
        "postgresql://::1"
    ):
        return "::1"
    host = urlparse(normalized).hostname
    return (host or "").lower()


def _allow_remote_audit() -> bool:
    return (os.environ.get("ALLOW_REMOTE_AUDIT_DB") or "").strip().lower() in {
        "yes",
        "1",
        "true",
    }


def _assert_safe_audit_database(*, hostname: str) -> None:
    if hostname in _LOCAL_HOSTS:
        return
    if _allow_remote_audit():
        print(
            f"WARNING: remote audit host allowed via ALLOW_REMOTE_AUDIT_DB "
            f"(host={hostname or '(unknown)'}). Read-only mode still enforced.",
            file=sys.stderr,
        )
        return
    print(
        f"Refusing audit against non-local database (host={hostname or '(unknown)'}). "
        "Use a local DATABASE_URL (localhost / 127.0.0.1 / ::1). "
        "Override only if intentional: ALLOW_REMOTE_AUDIT_DB=YES.",
        file=sys.stderr,
    )
    raise SystemExit(2)


def _mask_plate(plate_normalized: str | None) -> str:
    s = (plate_normalized or "").strip().upper()
    if len(s) <= 4:
        return "***"
    return f"{s[:2]}***{s[-2:]}"


def _install_readonly_guards(session: Any) -> None:
    """Refuse commit / flush so accidental writes cannot land."""

    def _refuse_commit() -> None:
        raise ReadOnlyAuditError("read-only audit: Session.commit() refused")

    def _refuse_flush(*_a: Any, **_k: Any) -> None:
        raise ReadOnlyAuditError("read-only audit: Session.flush() refused")

    session.commit = _refuse_commit  # type: ignore[method-assign]
    session.flush = _refuse_flush  # type: ignore[method-assign]


def main() -> int:
    # Import app stack only after path setup (uses settings.DATABASE_URL).
    from sqlalchemy import func, select

    from app.db.models.driver import Driver
    from app.db.models.vehicle import Vehicle
    from app.db.session import SessionLocal, get_database_url
    from app.models.enums import DriverStatus
    from app.services.partner_vehicle_documents import batch_document_summaries_for_vehicles
    from app.services.vehicle_document_compliance import (
        COMPLIANCE_BLOCKED,
        COMPLIANCE_COMPLIANT,
        COMPLIANCE_NO_ACTIVE_VEHICLE,
        COMPLIANCE_UNKNOWN,
        COMPLIANCE_WARNING,
        vehicle_compliance_status,
    )

    hostname = _database_hostname(get_database_url())
    _assert_safe_audit_database(hostname=hostname)

    db = SessionLocal()
    _install_readonly_guards(db)

    try:
        print("=== PF3D-AUDIT-1 — Vehicle document compliance (read-only) ===")
        print(f"db_host: {hostname or '(unknown)'}")
        print("mode: READ_ONLY (no commit/flush; no runtime gates)")
        print()

        total_drivers = db.scalar(select(func.count()).select_from(Driver)) or 0
        approved_drivers = (
            db.scalar(
                select(func.count()).select_from(Driver).where(
                    Driver.status == DriverStatus.approved
                )
            )
            or 0
        )
        # partner_id is NOT NULL in schema; still counted explicitly for the report.
        approved_with_partner = (
            db.scalar(
                select(func.count()).select_from(Driver).where(
                    Driver.status == DriverStatus.approved,
                    Driver.partner_id.is_not(None),
                )
            )
            or 0
        )
        approved_no_vehicle = (
            db.scalar(
                select(func.count()).select_from(Driver).where(
                    Driver.status == DriverStatus.approved,
                    Driver.active_vehicle_id.is_(None),
                )
            )
            or 0
        )
        approved_with_vehicle = (
            db.scalar(
                select(func.count()).select_from(Driver).where(
                    Driver.status == DriverStatus.approved,
                    Driver.active_vehicle_id.is_not(None),
                )
            )
            or 0
        )

        print("--- Drivers ---")
        print(f"total_drivers: {total_drivers}")
        print(f"approved_drivers: {approved_drivers}")
        print(f"approved_with_partner_id: {approved_with_partner}")
        print(f"approved_without_active_vehicle_id: {approved_no_vehicle}")
        print(f"approved_with_active_vehicle_id: {approved_with_vehicle}")
        print()

        active_by_partner = db.execute(
            select(Vehicle.partner_id, func.count())
            .where(Vehicle.status == "active")
            .group_by(Vehicle.partner_id)
            .order_by(Vehicle.partner_id)
        ).all()
        print("--- Active vehicles by partner ---")
        if not active_by_partner:
            print("(none)")
        else:
            for partner_id, n in active_by_partner:
                print(f"  partner_id={partner_id}  active_vehicles={n}")
        print(f"active_vehicles_total: {sum(n for _, n in active_by_partner)}")
        print()

        inactive_assigned = db.execute(
            select(func.count())
            .select_from(Driver)
            .join(Vehicle, Vehicle.id == Driver.active_vehicle_id)
            .where(
                Driver.active_vehicle_id.is_not(None),
                Vehicle.status == "inactive",
            )
        ).scalar_one()
        print("--- Inactive vehicles assigned to drivers ---")
        print(f"inactive_assigned_count: {inactive_assigned}")
        print()

        # --- Vehicle-level compliance (all vehicles; has_active_vehicle=True) ---
        all_vehicles = list(
            db.execute(select(Vehicle.id, Vehicle.partner_id, Vehicle.plate_normalized)).all()
        )
        vehicle_status_counts: Counter[str] = Counter()
        vehicle_blocking: Counter[str] = Counter()
        vehicle_warning: Counter[str] = Counter()

        by_partner_vids: dict[Any, list[Any]] = defaultdict(list)
        plate_by_vid: dict[Any, str] = {}
        for vid, partner_id, plate_norm in all_vehicles:
            by_partner_vids[partner_id].append(vid)
            plate_by_vid[vid] = plate_norm or ""

        for partner_id, vids in by_partner_vids.items():
            summaries = batch_document_summaries_for_vehicles(
                db,
                partner_id=partner_id,
                vehicle_ids=vids,
            )
            for vid in vids:
                result = vehicle_compliance_status(
                    summaries.get(vid),
                    has_active_vehicle=True,
                )
                vehicle_status_counts[result.compliance_status] += 1
                for reason in result.blocking_reasons:
                    vehicle_blocking[reason] += 1
                for reason in result.warning_reasons:
                    vehicle_warning[reason] += 1

        print("--- Vehicles (document_summary -> PF3D-1 helper) ---")
        print(f"vehicles_total: {len(all_vehicles)}")
        for key in (
            COMPLIANCE_COMPLIANT,
            COMPLIANCE_WARNING,
            COMPLIANCE_BLOCKED,
            COMPLIANCE_NO_ACTIVE_VEHICLE,
            COMPLIANCE_UNKNOWN,
        ):
            print(f"  {key}: {vehicle_status_counts.get(key, 0)}")
        print("blocking_reasons (vehicle rows; a vehicle may count in several):")
        for key in (
            "missing_documents",
            "expired_documents",
            "rejected_documents",
            "no_active_vehicle",
        ):
            print(f"  {key}: {vehicle_blocking.get(key, 0)}")
        print("warning_reasons (vehicle rows):")
        for key in ("expiring_soon", "pending_review"):
            print(f"  {key}: {vehicle_warning.get(key, 0)}")
        print()

        # --- Approved-driver impact (future online/matching/accept) ---
        approved_rows = list(
            db.execute(
                select(
                    Driver.user_id,
                    Driver.partner_id,
                    Driver.active_vehicle_id,
                ).where(Driver.status == DriverStatus.approved)
            ).all()
        )
        driver_status_counts: Counter[str] = Counter()
        driver_blocking: Counter[str] = Counter()
        driver_warning: Counter[str] = Counter()
        examples: list[dict[str, Any]] = []

        # Batch summaries for vehicles that are active on approved drivers.
        vids_by_partner: dict[Any, list[Any]] = defaultdict(list)
        for _uid, partner_id, avid in approved_rows:
            if avid is not None:
                vids_by_partner[partner_id].append(avid)
        summary_by_vid: dict[Any, Any] = {}
        for partner_id, vids in vids_by_partner.items():
            # Deduplicate while preserving batch API.
            unique = list(dict.fromkeys(vids))
            summary_by_vid.update(
                batch_document_summaries_for_vehicles(
                    db,
                    partner_id=partner_id,
                    vehicle_ids=unique,
                )
            )

        for user_id, partner_id, avid in approved_rows:
            if avid is None:
                result = vehicle_compliance_status(None, has_active_vehicle=False)
            else:
                result = vehicle_compliance_status(
                    summary_by_vid.get(avid),
                    has_active_vehicle=True,
                )
            driver_status_counts[result.compliance_status] += 1
            for reason in result.blocking_reasons:
                driver_blocking[reason] += 1
            for reason in result.warning_reasons:
                driver_warning[reason] += 1

            interesting = result.compliance_status in {
                COMPLIANCE_BLOCKED,
                COMPLIANCE_NO_ACTIVE_VEHICLE,
                COMPLIANCE_WARNING,
                COMPLIANCE_UNKNOWN,
            }
            if interesting and len(examples) < _EXAMPLE_LIMIT:
                examples.append(
                    {
                        "driver_id": str(user_id),
                        "partner_id": str(partner_id),
                        "vehicle_id": str(avid) if avid else None,
                        "plate_masked": (
                            _mask_plate(plate_by_vid.get(avid)) if avid else None
                        ),
                        "compliance_status": result.compliance_status,
                        "blocking_reasons": list(result.blocking_reasons),
                        "warning_reasons": list(result.warning_reasons),
                    }
                )

        print("--- Approved drivers (future gate impact view) ---")
        print(f"approved_drivers_scored: {len(approved_rows)}")
        for key in (
            COMPLIANCE_COMPLIANT,
            COMPLIANCE_WARNING,
            COMPLIANCE_BLOCKED,
            COMPLIANCE_NO_ACTIVE_VEHICLE,
            COMPLIANCE_UNKNOWN,
        ):
            print(f"  {key}: {driver_status_counts.get(key, 0)}")
        print("blocking_reasons (approved drivers):")
        for key in (
            "missing_documents",
            "expired_documents",
            "rejected_documents",
            "no_active_vehicle",
        ):
            print(f"  {key}: {driver_blocking.get(key, 0)}")
        print("warning_reasons (approved drivers):")
        for key in ("expiring_soon", "pending_review"):
            print(f"  {key}: {driver_warning.get(key, 0)}")
        print()

        print(f"--- Examples (max {_EXAMPLE_LIMIT}; no secrets) ---")
        if not examples:
            print("(none — all scored drivers compliant, or no approved drivers)")
        else:
            for ex in examples:
                print(
                    "  "
                    f"driver_id={ex['driver_id']} "
                    f"partner_id={ex['partner_id']} "
                    f"vehicle_id={ex['vehicle_id']} "
                    f"plate={ex['plate_masked']} "
                    f"status={ex['compliance_status']} "
                    f"blocking={ex['blocking_reasons']} "
                    f"warning={ex['warning_reasons']}"
                )
        print()
        print(
            "NOTE: This audit does not enable PF3D-3 gates. "
            "Use counts to plan active_vehicle_id backfill before runtime blocks."
        )

        # Explicit rollback — no writes.
        db.rollback()
        return 0
    except ReadOnlyAuditError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        db.rollback()
        return 3
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
