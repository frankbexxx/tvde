#!/usr/bin/env python3
"""PF3D-DATA-1B — Dry-run suggestions for safe active_vehicle_id assignments.

Read-only. Never applies assignments, never enables gates, never prints secrets.

Safe suggestion rule (per partner)::

    exactly 1 approved driver without active_vehicle_id
    AND exactly 1 active vehicle not assigned to any driver
    → SUGGEST one_to_one_partner_match

Run::

    $env:DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/test_db'
    python scripts/suggest_active_vehicle_assignments.py
    python scripts/suggest_active_vehicle_assignments.py --format json
    python scripts/suggest_active_vehicle_assignments.py --partner-id <uuid>

Remote hosts refused unless ``ALLOW_REMOTE_AUDIT_DB=YES``.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from collections import defaultdict
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

_REPO_ROOT = Path(__file__).resolve().parents[1]
_BACKEND_ROOT = _REPO_ROOT / "backend"
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

_LOCAL_HOSTS = frozenset({"localhost", "127.0.0.1", "::1"})
_REASON_ONE_TO_ONE = "one_to_one_partner_match"


class ReadOnlyAuditError(RuntimeError):
    """Raised if the audit session attempts a write."""


@dataclass(frozen=True)
class Suggestion:
    partner_id: str
    driver_id: str
    vehicle_id: str
    plate_masked: str
    reason: str


@dataclass(frozen=True)
class AmbiguousPartner:
    partner_id: str
    free_drivers_count: int
    free_vehicles_count: int


@dataclass(frozen=True)
class SkippedPartner:
    partner_id: str
    reason: str


@dataclass
class Report:
    summary: dict[str, Any]
    suggestions: list[Suggestion]
    ambiguous: list[AmbiguousPartner]
    skipped: list[SkippedPartner]


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
    def _refuse_commit() -> None:
        raise ReadOnlyAuditError("read-only suggest: Session.commit() refused")

    def _refuse_flush(*_a: Any, **_k: Any) -> None:
        raise ReadOnlyAuditError("read-only suggest: Session.flush() refused")

    session.commit = _refuse_commit  # type: ignore[method-assign]
    session.flush = _refuse_flush  # type: ignore[method-assign]


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "PF3D DATA-1B dry-run suggestions for safe active_vehicle_id assignments."
        ),
    )
    parser.add_argument(
        "--partner-id",
        type=str,
        default=None,
        help="Limit suggestions to a single partner UUID.",
    )
    parser.add_argument(
        "--format",
        choices=("text", "json"),
        default="text",
        help="Output format (default: text).",
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


def _build_report(
    *,
    db: Any,
    partner_filter: uuid.UUID | None,
) -> Report:
    from sqlalchemy import select

    from app.db.models.driver import Driver
    from app.db.models.vehicle import Vehicle
    from app.models.enums import DriverStatus

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
    approved_without_vehicle = [r for r in approved_rows if r[2] is None]

    # Any driver assignment blocks a vehicle (approved or not).
    assigned_vehicle_ids: set[uuid.UUID] = {
        avid for _uid, _pid, avid, _st in all_drivers if avid is not None
    }

    plate_by_vid: dict[uuid.UUID, str] = {}
    active_vids_by_partner: dict[uuid.UUID, list[uuid.UUID]] = defaultdict(list)
    for vid, partner_id, plate_norm, status in all_vehicles:
        plate_by_vid[vid] = plate_norm or ""
        if status == "active":
            active_vids_by_partner[partner_id].append(vid)

    free_drivers_by_partner: dict[uuid.UUID, list[uuid.UUID]] = defaultdict(list)
    for user_id, partner_id, avid in approved_without_vehicle:
        free_drivers_by_partner[partner_id].append(user_id)

    unassigned_active_total = 0
    free_vehicles_by_partner: dict[uuid.UUID, list[uuid.UUID]] = defaultdict(list)
    for partner_id, vids in active_vids_by_partner.items():
        for vid in vids:
            if vid not in assigned_vehicle_ids:
                free_vehicles_by_partner[partner_id].append(vid)
                unassigned_active_total += 1

    partner_ids = (
        set(free_drivers_by_partner)
        | set(free_vehicles_by_partner)
        | {pid for _, pid, _ in approved_rows}
        | set(active_vids_by_partner)
    )

    suggestions: list[Suggestion] = []
    ambiguous: list[AmbiguousPartner] = []
    skipped: list[SkippedPartner] = []

    for partner_id in sorted(partner_ids, key=str):
        free_drivers = free_drivers_by_partner.get(partner_id, [])
        free_vehicles = free_vehicles_by_partner.get(partner_id, [])
        n_d = len(free_drivers)
        n_v = len(free_vehicles)

        if n_d == 1 and n_v == 1:
            vid = free_vehicles[0]
            suggestions.append(
                Suggestion(
                    partner_id=str(partner_id),
                    driver_id=str(free_drivers[0]),
                    vehicle_id=str(vid),
                    plate_masked=_mask_plate(plate_by_vid.get(vid)),
                    reason=_REASON_ONE_TO_ONE,
                )
            )
        elif n_d > 0 or n_v > 0:
            ambiguous.append(
                AmbiguousPartner(
                    partner_id=str(partner_id),
                    free_drivers_count=n_d,
                    free_vehicles_count=n_v,
                )
            )
        else:
            skipped.append(
                SkippedPartner(
                    partner_id=str(partner_id),
                    reason="no_free_drivers_and_no_unassigned_active_vehicles",
                )
            )

    ambiguous.sort(
        key=lambda a: (
            -a.free_drivers_count,
            -a.free_vehicles_count,
            a.partner_id,
        )
    )

    summary = {
        "mode": "dry_run_read_only",
        "partner_filter": str(partner_filter) if partner_filter else None,
        "approved_drivers_without_active_vehicle_id": len(approved_without_vehicle),
        "active_unassigned_vehicles": unassigned_active_total,
        "safe_suggestions_count": len(suggestions),
        "ambiguous_partner_count": len(ambiguous),
        "skipped_partner_count": len(skipped),
        "partners_in_scope": len(partner_ids),
    }
    return Report(
        summary=summary,
        suggestions=suggestions,
        ambiguous=ambiguous,
        skipped=skipped,
    )


def _print_text(report: Report, *, hostname: str) -> None:
    print("=== PF3D-DATA-1B — Suggest active_vehicle_id (dry-run only) ===")
    print(f"db_host: {hostname or '(unknown)'}")
    print("mode: READ_ONLY dry-run (no apply; no gates; no writes)")
    if report.summary.get("partner_filter"):
        print(f"partner_filter: {report.summary['partner_filter']}")
    print()

    print("--- Summary ---")
    print(
        "approved_drivers_without_active_vehicle_id: "
        f"{report.summary['approved_drivers_without_active_vehicle_id']}"
    )
    print(
        f"active_unassigned_vehicles: {report.summary['active_unassigned_vehicles']}"
    )
    print(f"safe_suggestions_count: {report.summary['safe_suggestions_count']}")
    print(f"ambiguous_partner_count: {report.summary['ambiguous_partner_count']}")
    print(f"skipped_partner_count: {report.summary['skipped_partner_count']}")
    print()

    print("--- SUGGEST (not applied) ---")
    if not report.suggestions:
        print("(none)")
    else:
        for s in report.suggestions:
            print(
                "  SUGGEST "
                f"partner_id={s.partner_id} "
                f"driver_id={s.driver_id} "
                f"vehicle_id={s.vehicle_id} "
                f"plate={s.plate_masked} "
                f"reason={s.reason}"
            )
    print()

    print("--- AMBIGUOUS (no auto suggestion) ---")
    if not report.ambiguous:
        print("(none)")
    else:
        for a in report.ambiguous:
            print(
                "  "
                f"partner_id={a.partner_id} "
                f"free_drivers_count={a.free_drivers_count} "
                f"free_vehicles_count={a.free_vehicles_count}"
            )
    print()

    print("--- SKIPPED (no free drivers and no free vehicles) ---")
    print(f"skipped_partner_count: {len(report.skipped)}")
    if report.skipped:
        # Keep short: first 10 ids only.
        preview = report.skipped[:10]
        for sk in preview:
            print(f"  partner_id={sk.partner_id} reason={sk.reason}")
        if len(report.skipped) > 10:
            print(f"  ... and {len(report.skipped) - 10} more")
    print()
    print(
        "NOTE: DATA-1B does not write active_vehicle_id. "
        "Apply is out of scope (future DATA-1C, dev/test only)."
    )


def _print_json(report: Report, *, hostname: str) -> None:
    payload = {
        "db_host": hostname or "(unknown)",
        "summary": report.summary,
        "suggestions": [asdict(s) for s in report.suggestions],
        "ambiguous": [asdict(a) for a in report.ambiguous],
        "skipped": [asdict(s) for s in report.skipped],
    }
    print(json.dumps(payload, indent=2, sort_keys=False))


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    partner_filter = _parse_partner_filter(args.partner_id)

    from app.db.session import SessionLocal, get_database_url

    hostname = _database_hostname(get_database_url())
    _assert_safe_audit_database(hostname=hostname)

    db = SessionLocal()
    _install_readonly_guards(db)
    try:
        report = _build_report(db=db, partner_filter=partner_filter)
        if args.format == "json":
            _print_json(report, hostname=hostname)
        else:
            _print_text(report, hostname=hostname)
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
