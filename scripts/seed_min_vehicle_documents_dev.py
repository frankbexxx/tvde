#!/usr/bin/env python3
"""PF3D-DATA-1D — Seed minimum dummy vehicle documents (dev/test local only).

DEV/TEST DUMMY DOCUMENTS ONLY — not real compliance.

Default dry-run. Apply requires::

    --apply --confirm SEED_MIN_VEHICLE_DOCS_DEV

Targets (default): active vehicles currently assigned to an approved driver
(``drivers.active_vehicle_id``). Does **not** seed unassigned vehicles.

Dummy rows use ``status=approved`` + ``expires_at`` ~ +365d so PF3C summary
slot status is ``valid`` (not ``pending_review`` / warning). ``file_path`` is
left NULL (nullable — no real upload).

Run::

    $env:DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/test_db'
    python scripts/seed_min_vehicle_documents_dev.py
    python scripts/seed_min_vehicle_documents_dev.py --apply --confirm SEED_MIN_VEHICLE_DOCS_DEV
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

_REPO_ROOT = Path(__file__).resolve().parents[1]
_BACKEND_ROOT = _REPO_ROOT / "backend"
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

_LOCAL_HOSTS = frozenset({"localhost", "127.0.0.1", "::1"})
_CONFIRM_TOKEN = "SEED_MIN_VEHICLE_DOCS_DEV"
_DUMMY_NOTES = "DEV/TEST DUMMY DOCUMENT ONLY — PF3D-DATA-1D"
_DUMMY_ISSUER = "TVDE DEV SEED"
_EXPIRY_DAYS = 365


class ReadOnlyAuditError(RuntimeError):
    """Raised if a dry-run session attempts a write."""


@dataclass(frozen=True)
class WouldCreate:
    partner_id: str
    vehicle_id: str
    plate_masked: str
    document_type: str
    status: str
    expires_at: str


@dataclass
class Report:
    summary: dict[str, Any]
    would_create: list[WouldCreate] = field(default_factory=list)
    created: list[WouldCreate] = field(default_factory=list)
    skipped_due_to_race: list[dict[str, str]] = field(default_factory=list)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


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


def _assert_safe_dry_run_database(*, hostname: str) -> None:
    if hostname in _LOCAL_HOSTS:
        return
    allow = (os.environ.get("ALLOW_REMOTE_AUDIT_DB") or "").strip().lower() in {
        "yes",
        "1",
        "true",
    }
    if allow:
        print(
            f"WARNING: remote host allowed for dry-run via ALLOW_REMOTE_AUDIT_DB "
            f"(host={hostname or '(unknown)'}). Apply still forbidden.",
            file=sys.stderr,
        )
        return
    print(
        f"Refusing against non-local database (host={hostname or '(unknown)'}). "
        "Use local DATABASE_URL. Override dry-run only: ALLOW_REMOTE_AUDIT_DB=YES.",
        file=sys.stderr,
    )
    raise SystemExit(2)


def _assert_apply_allowed(*, hostname: str) -> None:
    if hostname not in _LOCAL_HOSTS:
        print(
            f"Refusing --apply against non-local database "
            f"(host={hostname or '(unknown)'}). "
            "DATA-1D apply is local/dev/test only.",
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
    p = argparse.ArgumentParser(
        description=(
            "PF3D DATA-1D: seed minimum dummy vehicle documents (dev/test local)."
        ),
    )
    p.add_argument("--partner-id", type=str, default=None)
    p.add_argument("--vehicle-id", type=str, default=None)
    p.add_argument("--format", choices=("text", "json"), default="text")
    p.add_argument("--apply", action="store_true")
    p.add_argument(
        "--confirm",
        type=str,
        default=None,
        help=f"Exact token with --apply: {_CONFIRM_TOKEN}",
    )
    return p.parse_args(argv)


def _parse_uuid(raw: str | None, *, label: str) -> uuid.UUID | None:
    if raw is None or not raw.strip():
        return None
    try:
        return uuid.UUID(raw.strip())
    except ValueError as exc:
        print(f"Invalid {label}: {raw!r}", file=sys.stderr)
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
            f"Refusing --apply: --confirm token mismatch (expected {_CONFIRM_TOKEN}).",
            file=sys.stderr,
        )
        raise SystemExit(2)


def _dummy_metadata() -> str:
    return json.dumps(
        {
            "dev_dummy": True,
            "source": "seed_min_vehicle_documents_dev",
            "pf3d": "DATA-1D",
            "warning": "DEV/TEST DUMMY DOCUMENTS ONLY",
        },
        separators=(",", ":"),
    )


def _target_vehicles(
    db: Any,
    *,
    partner_filter: uuid.UUID | None,
    vehicle_filter: uuid.UUID | None,
) -> list[tuple[uuid.UUID, uuid.UUID, str]]:
    """Return (vehicle_id, partner_id, plate_normalized) for assigned active vehicles."""
    from sqlalchemy import select

    from app.db.models.driver import Driver
    from app.db.models.vehicle import Vehicle
    from app.models.enums import DriverStatus

    q = (
        select(Vehicle.id, Vehicle.partner_id, Vehicle.plate_normalized)
        .join(Driver, Driver.active_vehicle_id == Vehicle.id)
        .where(
            Driver.status == DriverStatus.approved,
            Vehicle.status == "active",
        )
    )
    if partner_filter is not None:
        q = q.where(Vehicle.partner_id == partner_filter)
    if vehicle_filter is not None:
        q = q.where(Vehicle.id == vehicle_filter)
    rows = list(db.execute(q).all())
    # Deduplicate vehicle ids (UNIQUE active_vehicle_id should already ensure 1).
    seen: set[uuid.UUID] = set()
    out: list[tuple[uuid.UUID, uuid.UUID, str]] = []
    for vid, pid, plate in rows:
        if vid in seen:
            continue
        seen.add(vid)
        out.append((vid, pid, plate or ""))
    return out


def _existing_types_for_vehicle(db: Any, vehicle_id: uuid.UUID) -> set[str]:
    from sqlalchemy import select

    from app.db.models.vehicle_document import VehicleDocument

    rows = db.execute(
        select(VehicleDocument.document_type).where(
            VehicleDocument.vehicle_id == vehicle_id
        )
    ).scalars().all()
    return {str(t) for t in rows}


def _plan_creates(
    db: Any,
    *,
    partner_filter: uuid.UUID | None,
    vehicle_filter: uuid.UUID | None,
) -> tuple[
    list[WouldCreate],
    int,
    int,
    int,
    list[uuid.UUID],
]:
    """Return (would_create, vehicles_considered, would_compliant, skipped_existing, vehicle_ids)."""
    from sqlalchemy import select

    from app.db.models.vehicle_document import VehicleDocument
    from app.services.partner_vehicle_documents import (
        VEHICLE_DOCUMENT_REQUIRED_TYPES_ORDERED,
        summarize_vehicle_documents_rows,
    )
    from app.services.vehicle_document_compliance import (
        COMPLIANCE_COMPLIANT,
        vehicle_compliance_status,
    )

    class _FakeRow:
        def __init__(
            self, document_type: str, status: str, expires_at: datetime | None
        ) -> None:
            self.document_type = document_type
            self.status = status
            self.expires_at = expires_at

    now = _utc_now()
    expires = now + timedelta(days=_EXPIRY_DAYS)
    expires_iso = expires.isoformat().replace("+00:00", "Z")

    targets = _target_vehicles(
        db, partner_filter=partner_filter, vehicle_filter=vehicle_filter
    )
    would: list[WouldCreate] = []
    vehicles_would_compliant = 0
    vehicles_skipped_existing = 0
    vehicle_ids: list[uuid.UUID] = []

    for vid, pid, plate in targets:
        vehicle_ids.append(vid)
        existing = _existing_types_for_vehicle(db, vid)
        missing = [
            t for t in VEHICLE_DOCUMENT_REQUIRED_TYPES_ORDERED if t not in existing
        ]
        if not missing:
            vehicles_skipped_existing += 1
        for doc_type in missing:
            would.append(
                WouldCreate(
                    partner_id=str(pid),
                    vehicle_id=str(vid),
                    plate_masked=_mask_plate(plate),
                    document_type=doc_type,
                    status="approved",
                    expires_at=expires_iso,
                )
            )

        current_rows = list(
            db.execute(
                select(VehicleDocument).where(VehicleDocument.vehicle_id == vid)
            )
            .scalars()
            .all()
        )
        by_type = {row.document_type: row for row in current_rows}
        fake_rows: list[Any] = []
        for t in VEHICLE_DOCUMENT_REQUIRED_TYPES_ORDERED:
            if t in missing:
                fake_rows.append(_FakeRow(t, "approved", expires))
            else:
                row = by_type.get(t)
                if row is not None:
                    fake_rows.append(row)
        summary = summarize_vehicle_documents_rows(fake_rows, now=now)
        result = vehicle_compliance_status(summary, has_active_vehicle=True)
        if result.compliance_status == COMPLIANCE_COMPLIANT:
            vehicles_would_compliant += 1

    return (
        would,
        len(targets),
        vehicles_would_compliant,
        vehicles_skipped_existing,
        vehicle_ids,
    )


def _build_dry_run_report(
    db: Any,
    *,
    partner_filter: uuid.UUID | None,
    vehicle_filter: uuid.UUID | None,
) -> Report:
    would, considered, would_compliant, skipped_existing, _vids = _plan_creates(
        db,
        partner_filter=partner_filter,
        vehicle_filter=vehicle_filter,
    )
    return Report(
        summary={
            "mode": "dry_run",
            "disclaimer": "DEV/TEST DUMMY DOCUMENTS ONLY",
            "status_decision": "approved + expires_at=+365d → summary valid (not pending_review)",
            "file_path": None,
            "partner_filter": str(partner_filter) if partner_filter else None,
            "vehicle_filter": str(vehicle_filter) if vehicle_filter else None,
            "vehicles_considered": considered,
            "docs_to_create_count": len(would),
            "vehicles_would_become_compliant": would_compliant,
            "vehicles_skipped_existing_docs": skipped_existing,
        },
        would_create=would,
    )


def _apply_seed(
    db: Any,
    *,
    partner_filter: uuid.UUID | None,
    vehicle_filter: uuid.UUID | None,
) -> Report:
    from app.db.models.vehicle_document import VehicleDocument
    from app.services.partner_vehicle_documents import (
        VEHICLE_DOCUMENT_REQUIRED_TYPES_ORDERED,
        document_summary_for_vehicle,
    )
    from app.services.vehicle_document_compliance import (
        COMPLIANCE_COMPLIANT,
        vehicle_compliance_status,
    )

    before = _build_dry_run_report(
        db, partner_filter=partner_filter, vehicle_filter=vehicle_filter
    )
    now = _utc_now()
    expires = now + timedelta(days=_EXPIRY_DAYS)
    created: list[WouldCreate] = []
    raced: list[dict[str, str]] = []

    for item in before.would_create:
        vid = uuid.UUID(item.vehicle_id)
        pid = uuid.UUID(item.partner_id)
        existing = _existing_types_for_vehicle(db, vid)
        if item.document_type in existing:
            raced.append(
                {
                    "vehicle_id": item.vehicle_id,
                    "document_type": item.document_type,
                    "reason": "already_exists",
                }
            )
            continue
        # Ensure vehicle still assigned to an approved driver and active.
        targets = {
            t[0]
            for t in _target_vehicles(
                db, partner_filter=pid, vehicle_filter=vid
            )
        }
        if vid not in targets:
            raced.append(
                {
                    "vehicle_id": item.vehicle_id,
                    "document_type": item.document_type,
                    "reason": "vehicle_no_longer_eligible",
                }
            )
            continue

        doc = VehicleDocument(
            id=uuid.uuid4(),
            vehicle_id=vid,
            partner_id=pid,
            document_type=item.document_type,
            status="approved",
            file_path=None,
            file_name=None,
            document_number=f"DEV-DUMMY-{item.document_type[:12].upper()}",
            issuer=_DUMMY_ISSUER,
            valid_from=now,
            expires_at=expires,
            issued_at=now,
            metadata_json=_dummy_metadata(),
            notes=_DUMMY_NOTES,
            reviewed_by=None,
            reviewed_at=now,
        )
        db.add(doc)
        db.flush()
        created.append(item)

    db.commit()
    db.expire_all()

    # After: compliance for assigned active vehicles in filter.
    targets = _target_vehicles(
        db, partner_filter=partner_filter, vehicle_filter=vehicle_filter
    )
    compliant_count = 0
    for vid, pid, _plate in targets:
        summary = document_summary_for_vehicle(
            db, partner_id=pid, vehicle_id=vid
        )
        result = vehicle_compliance_status(summary, has_active_vehicle=True)
        if result.compliance_status == COMPLIANCE_COMPLIANT:
            compliant_count += 1

    return Report(
        summary={
            "mode": "apply_dev_only",
            "disclaimer": "DEV/TEST DUMMY DOCUMENTS ONLY",
            "status_decision": "approved + expires_at=+365d → summary valid",
            "partner_filter": str(partner_filter) if partner_filter else None,
            "vehicle_filter": str(vehicle_filter) if vehicle_filter else None,
            "vehicles_considered": before.summary["vehicles_considered"],
            "docs_to_create_count": before.summary["docs_to_create_count"],
            "created_count": len(created),
            "vehicles_now_compliant_count": compliant_count,
            "skipped_existing_count": before.summary["vehicles_skipped_existing_docs"],
            "skipped_due_to_race_count": len(raced),
            "required_types": list(VEHICLE_DOCUMENT_REQUIRED_TYPES_ORDERED),
        },
        would_create=before.would_create,
        created=created,
        skipped_due_to_race=raced,
    )


def _print_text(report: Report, *, hostname: str) -> None:
    mode = report.summary.get("mode", "?")
    print("=== PF3D-DATA-1D — Seed min vehicle documents (DEV/TEST DUMMY) ===")
    print(f"db_host: {hostname or '(unknown)'}")
    print(f"mode: {mode}")
    print("DISCLAIMER: DEV/TEST DUMMY DOCUMENTS ONLY — not real compliance")
    print(
        "status_decision: stored status=approved + expires_at=+365d "
        "(summary slot=valid; pending_review would NOT be enough for compliant)"
    )
    print("file_path: NULL (no real file; column nullable)")
    if report.summary.get("partner_filter"):
        print(f"partner_filter: {report.summary['partner_filter']}")
    if report.summary.get("vehicle_filter"):
        print(f"vehicle_filter: {report.summary['vehicle_filter']}")
    print()

    print("--- Summary ---")
    for key in (
        "vehicles_considered",
        "docs_to_create_count",
        "vehicles_would_become_compliant",
        "vehicles_skipped_existing_docs",
        "created_count",
        "vehicles_now_compliant_count",
        "skipped_existing_count",
        "skipped_due_to_race_count",
    ):
        if key in report.summary:
            print(f"{key}: {report.summary[key]}")
    print()

    if mode == "dry_run":
        print("--- WOULD_CREATE ---")
        if not report.would_create:
            print("(none)")
        else:
            for row in report.would_create:
                print(
                    "  WOULD_CREATE "
                    f"partner_id={row.partner_id} "
                    f"vehicle_id={row.vehicle_id} "
                    f"plate={row.plate_masked} "
                    f"document_type={row.document_type} "
                    f"status={row.status} "
                    f"expires_at={row.expires_at}"
                )
        print()
        print(
            "To apply locally (dev/test only):\n"
            f"  python scripts/seed_min_vehicle_documents_dev.py "
            f"--apply --confirm {_CONFIRM_TOKEN}"
        )
    else:
        print("--- CREATED ---")
        if not report.created:
            print("(none)")
        else:
            for row in report.created:
                print(
                    "  CREATED "
                    f"partner_id={row.partner_id} "
                    f"vehicle_id={row.vehicle_id} "
                    f"plate={row.plate_masked} "
                    f"document_type={row.document_type} "
                    f"status={row.status} "
                    f"expires_at={row.expires_at}"
                )
        if report.skipped_due_to_race:
            print()
            print("--- SKIPPED DUE TO RACE ---")
            for row in report.skipped_due_to_race:
                print(
                    "  "
                    f"vehicle_id={row['vehicle_id']} "
                    f"document_type={row['document_type']} "
                    f"reason={row['reason']}"
                )
        print()
        print(
            "NOTE: Dummy docs only. Re-run audit_vehicle_document_compliance.py. "
            "Does not assign vehicles to the 110 drivers without active_vehicle_id. "
            "No PF3D-3 gates enabled."
        )


def _print_json(report: Report, *, hostname: str) -> None:
    payload = {
        "db_host": hostname or "(unknown)",
        "summary": report.summary,
        "would_create": [asdict(x) for x in report.would_create],
        "created": [asdict(x) for x in report.created],
        "skipped_due_to_race": list(report.skipped_due_to_race),
    }
    print(json.dumps(payload, indent=2, sort_keys=False))


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    partner_filter = _parse_uuid(args.partner_id, label="--partner-id")
    vehicle_filter = _parse_uuid(args.vehicle_id, label="--vehicle-id")
    apply_mode = bool(args.apply)

    if apply_mode:
        _assert_apply_confirm(args.confirm)

    from app.db.session import SessionLocal, get_database_url

    hostname = _database_hostname(get_database_url())
    if apply_mode:
        _assert_apply_allowed(hostname=hostname)
    else:
        _assert_safe_dry_run_database(hostname=hostname)

    db = SessionLocal()
    if not apply_mode:
        _install_readonly_guards(db)

    try:
        if apply_mode:
            report = _apply_seed(
                db,
                partner_filter=partner_filter,
                vehicle_filter=vehicle_filter,
            )
        else:
            report = _build_dry_run_report(
                db,
                partner_filter=partner_filter,
                vehicle_filter=vehicle_filter,
            )
            db.rollback()

        if args.format == "json":
            _print_json(report, hostname=hostname)
        else:
            _print_text(report, hostname=hostname)
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
