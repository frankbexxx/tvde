#!/usr/bin/env python3
"""PF3D-AUDIT-1 / DATA-1A — Read-only impact audit for future vehicle document gates.

Does **not** enable gates, write to the DB, mutate state, or print secrets.

Run (local Postgres recommended)::

    $env:DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/test_db'
    python scripts/audit_vehicle_document_compliance.py
    python scripts/audit_vehicle_document_compliance.py --partner-id <uuid>

Remote / non-local hosts are refused unless ``ALLOW_REMOTE_AUDIT_DB=YES``.
Never prints DATABASE_URL, passwords, or tokens — only hostname.
"""

from __future__ import annotations

import argparse
import os
import sys
import uuid
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

_REPO_ROOT = Path(__file__).resolve().parents[1]
_BACKEND_ROOT = _REPO_ROOT / "backend"
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

_LOCAL_HOSTS = frozenset({"localhost", "127.0.0.1", "::1"})
_EXAMPLE_PER_BUCKET = 3
_COMPLIANCE_BUCKETS = (
    "compliant",
    "warning",
    "blocked",
    "no_active_vehicle",
    "unknown",
)


class ReadOnlyAuditError(RuntimeError):
    """Raised if the audit session attempts a write."""


@dataclass
class PartnerRow:
    partner_id: uuid.UUID
    approved_drivers: int = 0
    drivers_without_active_vehicle: int = 0
    drivers_with_active_vehicle: int = 0
    active_vehicles: int = 0
    unassigned_active_vehicles: int = 0
    buckets: Counter[str] = field(default_factory=Counter)


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


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="PF3D DATA-1A read-only vehicle document compliance audit.",
    )
    parser.add_argument(
        "--partner-id",
        type=str,
        default=None,
        help="Limit report to a single partner UUID.",
    )
    return parser.parse_args(argv)


def _parse_partner_filter(raw: str | None) -> uuid.UUID | None:
    if raw is None or not raw.strip():
        return None
    try:
        return uuid.UUID(raw.strip())
    except ValueError as exc:
        print(f"Invalid --partner-id: {raw!r}", file=sys.stderr)
        raise SystemExit(2) from exc


def _print_bucket_counts(counts: Counter[str], *, indent: str = "  ") -> None:
    for key in _COMPLIANCE_BUCKETS:
        print(f"{indent}{key}: {counts.get(key, 0)}")


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    partner_filter = _parse_partner_filter(args.partner_id)

    from sqlalchemy import select

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
        print("=== PF3D-AUDIT / DATA-1A — Vehicle document compliance (read-only) ===")
        print(f"db_host: {hostname or '(unknown)'}")
        print("mode: READ_ONLY (no commit/flush; no runtime gates; no apply)")
        if partner_filter is not None:
            print(f"partner_filter: {partner_filter}")
        print()

        driver_q = select(
            Driver.user_id,
            Driver.partner_id,
            Driver.active_vehicle_id,
            Driver.status,
        )
        vehicle_q = select(
            Vehicle.id,
            Vehicle.partner_id,
            Vehicle.plate_normalized,
            Vehicle.status,
        )
        if partner_filter is not None:
            driver_q = driver_q.where(Driver.partner_id == partner_filter)
            vehicle_q = vehicle_q.where(Vehicle.partner_id == partner_filter)

        all_drivers = list(db.execute(driver_q).all())
        all_vehicles = list(db.execute(vehicle_q).all())

        approved_rows = [
            (uid, pid, avid)
            for uid, pid, avid, status in all_drivers
            if status == DriverStatus.approved
        ]
        total_drivers = len(all_drivers)
        approved_drivers = len(approved_rows)
        approved_no_vehicle = sum(1 for _, _, avid in approved_rows if avid is None)
        approved_with_vehicle = approved_drivers - approved_no_vehicle

        print("--- Drivers (scope) ---")
        print(f"total_drivers: {total_drivers}")
        print(f"approved_drivers: {approved_drivers}")
        print(f"approved_without_active_vehicle_id: {approved_no_vehicle}")
        print(f"approved_with_active_vehicle_id: {approved_with_vehicle}")
        print()

        plate_by_vid: dict[uuid.UUID, str] = {}
        active_vids_by_partner: dict[uuid.UUID, list[uuid.UUID]] = defaultdict(list)
        assigned_vehicle_ids: set[uuid.UUID] = {
            avid for _, _, avid in approved_rows if avid is not None
        }
        # Also count assignment from any driver in scope (not only approved) for inventory.
        for _uid, _pid, avid, _st in all_drivers:
            if avid is not None:
                assigned_vehicle_ids.add(avid)

        for vid, partner_id, plate_norm, status in all_vehicles:
            plate_by_vid[vid] = plate_norm or ""
            if status == "active":
                active_vids_by_partner[partner_id].append(vid)

        inactive_assigned = 0
        vehicle_status_by_id = {vid: status for vid, _, _, status in all_vehicles}
        for avid in assigned_vehicle_ids:
            if vehicle_status_by_id.get(avid) == "inactive":
                inactive_assigned += 1

        print("--- Inactive vehicles assigned to drivers (scope) ---")
        print(f"inactive_assigned_count: {inactive_assigned}")
        print()

        # Document summaries for all vehicles in scope (vehicle-level view).
        by_partner_vids: dict[uuid.UUID, list[uuid.UUID]] = defaultdict(list)
        for vid, partner_id, _plate, _status in all_vehicles:
            by_partner_vids[partner_id].append(vid)

        summary_by_vid: dict[uuid.UUID, Any] = {}
        for partner_id, vids in by_partner_vids.items():
            summary_by_vid.update(
                batch_document_summaries_for_vehicles(
                    db,
                    partner_id=partner_id,
                    vehicle_ids=vids,
                )
            )

        vehicle_status_counts: Counter[str] = Counter()
        vehicle_blocking: Counter[str] = Counter()
        vehicle_warning: Counter[str] = Counter()
        for vid, _partner_id, _plate, _status in all_vehicles:
            result = vehicle_compliance_status(
                summary_by_vid.get(vid),
                has_active_vehicle=True,
            )
            vehicle_status_counts[result.compliance_status] += 1
            for reason in result.blocking_reasons:
                vehicle_blocking[reason] += 1
            for reason in result.warning_reasons:
                vehicle_warning[reason] += 1

        print("--- Vehicles (document_summary -> PF3D-1 helper) ---")
        print(f"vehicles_total: {len(all_vehicles)}")
        _print_bucket_counts(vehicle_status_counts)
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

        # Score approved drivers + build per-partner rows.
        partner_rows: dict[uuid.UUID, PartnerRow] = {}
        driver_status_counts: Counter[str] = Counter()
        driver_blocking: Counter[str] = Counter()
        driver_warning: Counter[str] = Counter()
        examples_by_bucket: dict[str, list[dict[str, Any]]] = {
            k: [] for k in _COMPLIANCE_BUCKETS
        }
        free_drivers_by_partner: dict[uuid.UUID, list[uuid.UUID]] = defaultdict(list)

        for partner_id, vids in active_vids_by_partner.items():
            row = partner_rows.setdefault(partner_id, PartnerRow(partner_id=partner_id))
            row.active_vehicles = len(vids)
            row.unassigned_active_vehicles = sum(
                1 for vid in vids if vid not in assigned_vehicle_ids
            )

        for user_id, partner_id, avid in approved_rows:
            row = partner_rows.setdefault(partner_id, PartnerRow(partner_id=partner_id))
            row.approved_drivers += 1
            if avid is None:
                row.drivers_without_active_vehicle += 1
                free_drivers_by_partner[partner_id].append(user_id)
                result = vehicle_compliance_status(None, has_active_vehicle=False)
            else:
                row.drivers_with_active_vehicle += 1
                result = vehicle_compliance_status(
                    summary_by_vid.get(avid),
                    has_active_vehicle=True,
                )

            row.buckets[result.compliance_status] += 1
            driver_status_counts[result.compliance_status] += 1
            for reason in result.blocking_reasons:
                driver_blocking[reason] += 1
            for reason in result.warning_reasons:
                driver_warning[reason] += 1

            bucket = result.compliance_status
            bucket_list = examples_by_bucket.get(bucket)
            if bucket_list is not None and len(bucket_list) < _EXAMPLE_PER_BUCKET:
                bucket_list.append(
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
        _print_bucket_counts(driver_status_counts)
        print()

        print("--- Impact split (approved drivers) ---")
        no_av = driver_status_counts.get(COMPLIANCE_NO_ACTIVE_VEHICLE, 0)
        blocked_docs = driver_status_counts.get(COMPLIANCE_BLOCKED, 0)
        print(f"no_active_vehicle: {no_av}")
        print(f"blocked_by_documents: {blocked_docs}")
        print(
            f"would_pass_gates_today (compliant+warning): "
            f"{driver_status_counts.get(COMPLIANCE_COMPLIANT, 0) + driver_status_counts.get(COMPLIANCE_WARNING, 0)}"
        )
        print(
            f"unknown: {driver_status_counts.get(COMPLIANCE_UNKNOWN, 0)}"
        )
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

        print("--- Per partner ---")
        if not partner_rows:
            print("(none in scope)")
        else:
            for partner_id in sorted(partner_rows.keys(), key=str):
                row = partner_rows[partner_id]
                print(f"partner_id={partner_id}")
                print(f"  approved_drivers: {row.approved_drivers}")
                print(
                    f"  drivers_without_active_vehicle: "
                    f"{row.drivers_without_active_vehicle}"
                )
                print(
                    f"  drivers_with_active_vehicle: {row.drivers_with_active_vehicle}"
                )
                print(f"  active_vehicles: {row.active_vehicles}")
                print(
                    f"  unassigned_active_vehicles: {row.unassigned_active_vehicles}"
                )
                print("  driver_compliance:")
                _print_bucket_counts(row.buckets, indent="    ")
        print()

        # 1:1 candidates and ambiguous (dry-run suggestions only).
        one_to_one: list[dict[str, Any]] = []
        ambiguous: list[dict[str, Any]] = []
        partner_ids_for_match = set(free_drivers_by_partner) | set(
            active_vids_by_partner
        )
        for partner_id in sorted(partner_ids_for_match, key=str):
            free_drivers = free_drivers_by_partner.get(partner_id, [])
            free_vehicles = [
                vid
                for vid in active_vids_by_partner.get(partner_id, [])
                if vid not in assigned_vehicle_ids
            ]
            n_d = len(free_drivers)
            n_v = len(free_vehicles)
            if n_d == 0 and n_v == 0:
                continue
            if n_d == 1 and n_v == 1:
                one_to_one.append(
                    {
                        "partner_id": str(partner_id),
                        "driver_id": str(free_drivers[0]),
                        "vehicle_id": str(free_vehicles[0]),
                        "plate_masked": _mask_plate(plate_by_vid.get(free_vehicles[0])),
                    }
                )
            elif n_d > 0 or n_v > 0:
                ambiguous.append(
                    {
                        "partner_id": str(partner_id),
                        "free_drivers_without_vehicle": n_d,
                        "unassigned_active_vehicles": n_v,
                    }
                )

        print("--- 1:1 candidates (dry-run only; NOT applied) ---")
        print(f"one_to_one_partner_count: {len(one_to_one)}")
        if not one_to_one:
            print("(none)")
        else:
            for cand in one_to_one:
                print(
                    "  SUGGEST "
                    f"partner_id={cand['partner_id']} "
                    f"driver_id={cand['driver_id']} "
                    f"vehicle_id={cand['vehicle_id']} "
                    f"plate={cand['plate_masked']}"
                )
        print()

        print("--- Ambiguous partners (no auto suggestion) ---")
        print(f"ambiguous_partner_count: {len(ambiguous)}")
        if not ambiguous:
            print("(none)")
        else:
            # Sort by free drivers desc for ops priority.
            ambiguous.sort(
                key=lambda x: (
                    -x["free_drivers_without_vehicle"],
                    -x["unassigned_active_vehicles"],
                    x["partner_id"],
                )
            )
            for amb in ambiguous:
                print(
                    "  "
                    f"partner_id={amb['partner_id']} "
                    f"free_drivers_without_vehicle={amb['free_drivers_without_vehicle']} "
                    f"unassigned_active_vehicles={amb['unassigned_active_vehicles']}"
                )
        print()

        print(
            f"--- Examples by bucket "
            f"(max {_EXAMPLE_PER_BUCKET} each; no secrets) ---"
        )
        any_example = False
        for bucket in _COMPLIANCE_BUCKETS:
            items = examples_by_bucket[bucket]
            print(f"{bucket}:")
            if not items:
                print("  (none)")
                continue
            any_example = True
            for ex in items:
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
        if not any_example:
            print("(no approved drivers in scope)")
        print()

        print(
            "NOTE: DATA-1A is read-only. Does not enable PF3D-3 gates, "
            "does not assign vehicles, does not seed documents."
        )

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
