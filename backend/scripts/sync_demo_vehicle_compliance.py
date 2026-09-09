#!/usr/bin/env python3
"""NON-WIPE sync of DEMO vehicle compliance (G-KYC-P0-04).

Default: dry-run (no writes). Apply requires::

    --apply --confirm SYNC_DEMO_VEHICLE_COMPLIANCE

Remote DB apply also requires::

    ALLOW_REMOTE_DEMO_SYNC=YES

Never uses ALLOW_REMOTE_BASELINE_WIPE. Never truncates.

Local dry-run::

    cd backend
    $env:DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/test_db"
    python scripts/sync_demo_vehicle_compliance.py

Future prod dry-run (review only — not apply in this task)::

    $env:ALLOW_REMOTE_DEMO_SYNC = "YES"
    $env:DATABASE_URL = "<prod-external-url>"
    python scripts/sync_demo_vehicle_compliance.py
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

_LOCAL_HOSTS = frozenset({"localhost", "127.0.0.1", "::1"})


class ReadOnlyError(RuntimeError):
    """Raised if a dry-run session attempts a write."""


def _database_hostname(url: str) -> str:
    normalized = url.strip()
    normalized = normalized.replace("postgresql+psycopg2://", "postgresql://", 1)
    normalized = normalized.replace("postgresql+psycopg://", "postgresql://", 1)
    normalized = normalized.replace("postgres+psycopg2://", "postgres://", 1)
    host = urlparse(normalized).hostname
    return (host or "").lower()


def _remote_sync_allowed() -> bool:
    return (os.environ.get("ALLOW_REMOTE_DEMO_SYNC") or "").strip().upper() == "YES"


def _assert_remote_read_allowed(*, hostname: str) -> None:
    if hostname in _LOCAL_HOSTS:
        return
    if _remote_sync_allowed():
        print(
            f"WARNING: remote dry-run allowed via ALLOW_REMOTE_DEMO_SYNC=YES "
            f"(host={hostname or '(unknown)'}).",
            file=sys.stderr,
        )
        return
    print(
        f"Refusing dry-run against non-local database "
        f"(host={hostname or '(unknown)'}). "
        "Set ALLOW_REMOTE_DEMO_SYNC=YES for intentional remote review.",
        file=sys.stderr,
    )
    raise SystemExit(2)


def _assert_apply_allowed(*, hostname: str) -> None:
    from app.core.config import settings
    from app.services.sync_demo_vehicle_compliance import REMOTE_ENV

    if hostname not in _LOCAL_HOSTS or settings.is_production_environment():
        if not _remote_sync_allowed():
            print(
                f"Refusing --apply against remote/production database "
                f"(host={hostname or '(unknown)'}). "
                f"Set {REMOTE_ENV}=YES (not ALLOW_REMOTE_BASELINE_WIPE).",
                file=sys.stderr,
            )
            raise SystemExit(2)
        print(
            f"WARNING: remote/prod demo sync apply via {REMOTE_ENV}=YES "
            f"(host={hostname or '(unknown)'}).",
            file=sys.stderr,
        )


def _install_readonly_guards(session: Any) -> None:
    def _refuse_commit() -> None:
        raise ReadOnlyError("dry-run: Session.commit() refused")

    def _refuse_flush(*_a: Any, **_k: Any) -> None:
        raise ReadOnlyError("dry-run: Session.flush() refused")

    session.commit = _refuse_commit  # type: ignore[method-assign]
    session.flush = _refuse_flush  # type: ignore[method-assign]


def _print_plan(plan: Any) -> None:
    print("=== DEMO vehicle compliance sync plan ===")
    print(f"ok={plan.ok} mode={plan.mode}")
    print(f"summary={json.dumps(plan.summary, ensure_ascii=False)}")
    if plan.aborts:
        print("--- ABORTS ---")
        for a in plan.aborts:
            print(f"  ! {a}")
    for d in plan.drivers:
        print("---")
        print(f"Driver phone={d.phone} user_id={d.user_id}")
        print(f"  Partner={d.partner_name} ({d.partner_id})")
        print(f"  is_test_account={d.is_test_account} status={d.driver_status}")
        print(f"  active_vehicle_before={d.active_vehicle_id_before}")
        print(f"  expected_plate={d.expected_plate} expected_vehicle_id={d.expected_vehicle_id}")
        print(f"  vehicle_action={d.vehicle_action} resolved={d.vehicle_id_resolved}")
        print(f"  compliance_before={d.compliance_before} → expected={d.compliance_after_expected}")
        print(f"  docs_before={json.dumps(d.docs_before, ensure_ascii=False)}")
        print(f"  docs_actions={d.docs_actions}")
        print(f"  actions={d.actions}")


def main(argv: list[str] | None = None) -> None:
    from app.services.sync_demo_vehicle_compliance import CONFIRM_TOKEN

    parser = argparse.ArgumentParser(
        description="NON-WIPE sync of DEMO vehicle compliance (dry-run default)."
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Persist changes (requires --confirm).",
    )
    parser.add_argument(
        "--confirm",
        default="",
        help=f"Must be exactly {CONFIRM_TOKEN} when --apply is set.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Emit plan JSON only.",
    )
    args = parser.parse_args(argv)

    from dotenv import load_dotenv

    load_dotenv(dotenv_path=_BACKEND_ROOT / ".env")

    from app.core.config import settings
    from app.db.session import SessionLocal
    from app.services.sync_demo_vehicle_compliance import (
        DemoSyncAbort,
        apply_demo_vehicle_compliance_sync,
        build_demo_vehicle_compliance_sync_plan,
    )

    database_url = settings.DATABASE_URL or os.environ.get("DATABASE_URL") or ""
    if not database_url.strip():
        print("DATABASE_URL em falta.", file=sys.stderr)
        raise SystemExit(2)
    hostname = _database_hostname(database_url)

    if args.apply:
        if args.confirm != CONFIRM_TOKEN:
            print(
                f"Recusado: --apply requer --confirm {CONFIRM_TOKEN}",
                file=sys.stderr,
            )
            raise SystemExit(2)
        _assert_apply_allowed(hostname=hostname)
    else:
        _assert_remote_read_allowed(hostname=hostname)

    db = SessionLocal()
    try:
        if not args.apply:
            _install_readonly_guards(db)
            plan = build_demo_vehicle_compliance_sync_plan(db)
            if args.json:
                print(json.dumps(plan.to_dict(), ensure_ascii=False, indent=2))
            else:
                _print_plan(plan)
            raise SystemExit(0 if plan.ok else 1)

        try:
            plan = apply_demo_vehicle_compliance_sync(db)
            db.commit()
        except DemoSyncAbort as exc:
            db.rollback()
            print(f"ABORT: {exc}", file=sys.stderr)
            raise SystemExit(1) from exc
        if args.json:
            print(json.dumps(plan.to_dict(), ensure_ascii=False, indent=2))
        else:
            _print_plan(plan)
            print("APPLY OK")
        raise SystemExit(0 if plan.ok else 1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
