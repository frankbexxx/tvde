#!/usr/bin/env python3
"""PF3D-DATA-1B/1C — Suggest (and optionally apply) safe active_vehicle_id assignments.

Default is dry-run / read-only. Apply is **dev/test local only**.

Safe rule (per partner)::

    exactly 1 approved driver without active_vehicle_id
    AND exactly 1 active vehicle not assigned to any driver
    → SUGGEST / APPLY one_to_one_partner_match

Dry-run::

    $env:DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/test_db'
    python scripts/suggest_active_vehicle_assignments.py
    python scripts/suggest_active_vehicle_assignments.py --format json

Apply (local only)::

    python scripts/suggest_active_vehicle_assignments.py --apply --confirm ASSIGN_ACTIVE_VEHICLES_DEV

Never enables PF3D-3 gates. Never prints DATABASE_URL / passwords / tokens.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from collections import defaultdict
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

_REPO_ROOT = Path(__file__).resolve().parents[1]
_BACKEND_ROOT = _REPO_ROOT / "backend"
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

_LOCAL_HOSTS = frozenset({"localhost", "127.0.0.1", "::1"})
_REASON_ONE_TO_ONE = "one_to_one_partner_match"
_CONFIRM_TOKEN = "ASSIGN_ACTIVE_VEHICLES_DEV"


class ReadOnlyAuditError(RuntimeError):
    """Raised if a dry-run session attempts a write."""


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
    applied: list[Suggestion] = field(default_factory=list)
    skipped_due_to_race: list[dict[str, str]] = field(default_factory=list)


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
    """Dry-run may use remote only with ALLOW_REMOTE_AUDIT_DB=YES."""
    if hostname in _LOCAL_HOSTS:
        return
    if _allow_remote_audit():
        print(
            f"WARNING: remote audit host allowed via ALLOW_REMOTE_AUDIT_DB "
            f"(host={hostname or '(unknown)'}). Dry-run only; apply still forbidden.",
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


def _assert_apply_allowed(*, hostname: str) -> None:
    """Apply: local host only + non-production ENV. Remote never allowed in this PR."""
    if hostname not in _LOCAL_HOSTS:
        print(
            f"Refusing --apply against non-local database "
            f"(host={hostname or '(unknown)'}). "
            "DATA-1C apply is local/dev/test only; remote apply is not permitted.",
            file=sys.stderr,
        )
        raise SystemExit(2)

    from app.core.config import settings

    if settings.is_production_environment():
        print(
            "Refusing --apply: production environment detected "
            "(ENV/ENVIRONMENT is prod/production).",
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
        raise ReadOnlyAuditError("dry-run: Session.commit() refused")

    def _refuse_flush(*_a: Any, **_k: Any) -> None:
        raise ReadOnlyAuditError("dry-run: Session.flush() refused")

    session.commit = _refuse_commit  # type: ignore[method-assign]
    session.flush = _refuse_flush  # type: ignore[method-assign]


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "PF3D DATA-1B/1C: dry-run suggestions for safe active_vehicle_id; "
            "optional local apply with --confirm."
        ),
    )
    parser.add_argument(
        "--partner-id",
        type=str,
        default=None,
        help="Limit to a single partner UUID.",
    )
    parser.add_argument(
        "--format",
        choices=("text", "json"),
        default="text",
        help="Output format (default: text).",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help=(
            "Apply 1:1 suggestions (local/dev/test only). "
            f"Requires --confirm {_CONFIRM_TOKEN}."
        ),
    )
    parser.add_argument(
        "--confirm",
        type=str,
        default=None,
        help=f"Exact token required with --apply: {_CONFIRM_TOKEN}",
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


def _assert_apply_confirm(confirm: str | None) -> None:
    if confirm is None or not str(confirm).strip():
        print(
            f"Refusing --apply without --confirm {_CONFIRM_TOKEN}",
            file=sys.stderr,
        )
        raise SystemExit(2)
    if str(confirm).strip() != _CONFIRM_TOKEN:
        print(
            "Refusing --apply: --confirm token mismatch "
            f"(expected {_CONFIRM_TOKEN}).",
            file=sys.stderr,
        )
        raise SystemExit(2)


def _build_report(
    *,
    db: Any,
    partner_filter: uuid.UUID | None,
    mode: str,
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
        "mode": mode,
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


def _revalidate_and_apply_one(
    db: Any,
    suggestion: Suggestion,
) -> tuple[bool, str]:
    """Return (applied, race_reason). Re-check 1:1 + row state under locks."""
    from sqlalchemy import select

    from app.db.models.driver import Driver
    from app.db.models.vehicle import Vehicle
    from app.models.enums import DriverStatus

    partner_id = uuid.UUID(suggestion.partner_id)
    driver_id = uuid.UUID(suggestion.driver_id)
    vehicle_id = uuid.UUID(suggestion.vehicle_id)

    driver = db.execute(
        select(Driver).where(Driver.user_id == driver_id).with_for_update()
    ).scalar_one_or_none()
    vehicle = db.execute(
        select(Vehicle).where(Vehicle.id == vehicle_id).with_for_update()
    ).scalar_one_or_none()

    if driver is None:
        return False, "driver_not_found"
    if vehicle is None:
        return False, "vehicle_not_found"
    if driver.status != DriverStatus.approved:
        return False, "driver_not_approved"
    if driver.active_vehicle_id is not None:
        return False, "driver_already_has_active_vehicle"
    if vehicle.status != "active":
        return False, "vehicle_not_active"
    if driver.partner_id != vehicle.partner_id:
        return False, "partner_mismatch"
    if driver.partner_id != partner_id or vehicle.partner_id != partner_id:
        return False, "partner_scope_mismatch"

    # Vehicle must still be unassigned.
    holder = db.execute(
        select(Driver.user_id).where(Driver.active_vehicle_id == vehicle_id)
    ).scalar_one_or_none()
    if holder is not None:
        return False, "vehicle_already_assigned"

    # Partner must still be exact 1:1.
    free_drivers = list(
        db.execute(
            select(Driver.user_id).where(
                Driver.partner_id == partner_id,
                Driver.status == DriverStatus.approved,
                Driver.active_vehicle_id.is_(None),
            )
        )
        .scalars()
        .all()
    )
    assigned_on_partner = set(
        db.execute(
            select(Driver.active_vehicle_id).where(
                Driver.partner_id == partner_id,
                Driver.active_vehicle_id.is_not(None),
            )
        )
        .scalars()
        .all()
    )
    all_active = list(
        db.execute(
            select(Vehicle.id).where(
                Vehicle.partner_id == partner_id,
                Vehicle.status == "active",
            )
        )
        .scalars()
        .all()
    )
    free_vehicles = [vid for vid in all_active if vid not in assigned_on_partner]

    if len(free_drivers) != 1 or len(free_vehicles) != 1:
        return False, "partner_no_longer_one_to_one"
    if free_drivers[0] != driver_id or free_vehicles[0] != vehicle_id:
        return False, "one_to_one_pair_changed"

    driver.active_vehicle_id = vehicle_id
    db.flush()
    return True, "applied"


def _apply_suggestions(
    db: Any,
    *,
    partner_filter: uuid.UUID | None,
) -> Report:
    before = _build_report(
        db=db,
        partner_filter=partner_filter,
        mode="apply_dev_only",
    )
    applied: list[Suggestion] = []
    raced: list[dict[str, str]] = []

    for suggestion in before.suggestions:
        ok, reason = _revalidate_and_apply_one(db, suggestion)
        if ok:
            applied.append(suggestion)
        else:
            raced.append(
                {
                    "partner_id": suggestion.partner_id,
                    "driver_id": suggestion.driver_id,
                    "vehicle_id": suggestion.vehicle_id,
                    "reason": reason,
                }
            )

    db.commit()
    db.expire_all()

    after = _build_report(
        db=db,
        partner_filter=partner_filter,
        mode="apply_dev_only",
    )
    after.applied = applied
    after.skipped_due_to_race = raced
    after.summary = {
        **after.summary,
        "mode": "apply_dev_only",
        "before_approved_without_active_vehicle_id": before.summary[
            "approved_drivers_without_active_vehicle_id"
        ],
        "before_active_unassigned_vehicles": before.summary[
            "active_unassigned_vehicles"
        ],
        "before_safe_suggestions_count": before.summary["safe_suggestions_count"],
        "applied_count": len(applied),
        "skipped_due_to_race_count": len(raced),
        "still_ambiguous_count": after.summary["ambiguous_partner_count"],
    }
    # Preserve pre-apply suggestion list for transparency.
    after.suggestions = before.suggestions
    return after


def _print_text_dry_run(report: Report, *, hostname: str) -> None:
    print("=== PF3D-DATA-1B/1C — Suggest active_vehicle_id (dry-run) ===")
    print(f"db_host: {hostname or '(unknown)'}")
    print("mode: dry_run_read_only (no writes; no gates)")
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
        preview = report.skipped[:10]
        for sk in preview:
            print(f"  partner_id={sk.partner_id} reason={sk.reason}")
        if len(report.skipped) > 10:
            print(f"  ... and {len(report.skipped) - 10} more")
    print()
    print(
        "To apply locally (dev/test only; never production/remote):\n"
        f"  python scripts/suggest_active_vehicle_assignments.py "
        f"--apply --confirm {_CONFIRM_TOKEN}"
    )


def _print_text_apply(report: Report, *, hostname: str) -> None:
    print("=== PF3D-DATA-1C — Apply active_vehicle_id (dev/test local) ===")
    print(f"db_host: {hostname or '(unknown)'}")
    print("mode: apply_dev_only")
    if report.summary.get("partner_filter"):
        print(f"partner_filter: {report.summary['partner_filter']}")
    print()

    print("--- Before / after ---")
    print(
        "before_approved_without_active_vehicle_id: "
        f"{report.summary.get('before_approved_without_active_vehicle_id')}"
    )
    print(
        "after_approved_without_active_vehicle_id: "
        f"{report.summary['approved_drivers_without_active_vehicle_id']}"
    )
    print(
        "before_active_unassigned_vehicles: "
        f"{report.summary.get('before_active_unassigned_vehicles')}"
    )
    print(
        "after_active_unassigned_vehicles: "
        f"{report.summary['active_unassigned_vehicles']}"
    )
    print(
        "before_safe_suggestions_count: "
        f"{report.summary.get('before_safe_suggestions_count')}"
    )
    print(f"applied_count: {report.summary.get('applied_count', 0)}")
    print(
        "skipped_due_to_race_count: "
        f"{report.summary.get('skipped_due_to_race_count', 0)}"
    )
    print(
        f"still_ambiguous_count: {report.summary.get('still_ambiguous_count', 0)}"
    )
    print()

    print("--- APPLIED ---")
    if not report.applied:
        print("(none)")
    else:
        for s in report.applied:
            print(
                "  APPLIED "
                f"partner_id={s.partner_id} "
                f"driver_id={s.driver_id} "
                f"vehicle_id={s.vehicle_id} "
                f"plate={s.plate_masked} "
                f"reason={s.reason}"
            )
    print()

    if report.skipped_due_to_race:
        print("--- SKIPPED DUE TO RACE ---")
        for row in report.skipped_due_to_race:
            print(
                "  "
                f"partner_id={row['partner_id']} "
                f"driver_id={row['driver_id']} "
                f"vehicle_id={row['vehicle_id']} "
                f"reason={row['reason']}"
            )
        print()

    print(
        "NOTE: Assignments only. No document seed, no PF3D-3 gates. "
        "Re-run audit_vehicle_document_compliance.py next."
    )


def _print_json(report: Report, *, hostname: str) -> None:
    payload = {
        "db_host": hostname or "(unknown)",
        "summary": report.summary,
        "suggestions": [asdict(s) for s in report.suggestions],
        "ambiguous": [asdict(a) for a in report.ambiguous],
        "skipped": [asdict(s) for s in report.skipped],
        "applied": [asdict(s) for s in report.applied],
        "skipped_due_to_race": list(report.skipped_due_to_race),
    }
    print(json.dumps(payload, indent=2, sort_keys=False))


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    partner_filter = _parse_partner_filter(args.partner_id)
    apply_mode = bool(args.apply)

    if apply_mode:
        _assert_apply_confirm(args.confirm)

    from app.db.session import SessionLocal, get_database_url

    hostname = _database_hostname(get_database_url())
    if apply_mode:
        _assert_apply_allowed(hostname=hostname)
    else:
        _assert_safe_audit_database(hostname=hostname)

    db = SessionLocal()
    if not apply_mode:
        _install_readonly_guards(db)

    try:
        if apply_mode:
            report = _apply_suggestions(db, partner_filter=partner_filter)
            if args.format == "json":
                _print_json(report, hostname=hostname)
            else:
                _print_text_apply(report, hostname=hostname)
        else:
            report = _build_report(
                db=db,
                partner_filter=partner_filter,
                mode="dry_run_read_only",
            )
            if args.format == "json":
                _print_json(report, hostname=hostname)
            else:
                _print_text_dry_run(report, hostname=hostname)
            db.rollback()
        return 0
    except ReadOnlyAuditError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        db.rollback()
        return 3
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
