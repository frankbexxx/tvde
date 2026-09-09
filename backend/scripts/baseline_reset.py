#!/usr/bin/env python3
"""Wipe DB + seed baseline roster — local by default.

O router ``POST /dev/baseline-reset`` **não** está montado em ``ENVIRONMENT=prod``.
Este CLI **recusa** hosts remotinhos salvo ``ALLOW_REMOTE_BASELINE_WIPE=YES``.

  cd backend
  $env:DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/test_db"
  python scripts/baseline_reset.py --confirm WIPE_ALL_TVDE_BASELINE

Requer pacote instalado (ou venv activo) e Postgres acessível.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from urllib.parse import urlparse

_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

_LOCAL_HOSTS = frozenset({"localhost", "127.0.0.1", "::1"})
_CONFIRM = "WIPE_ALL_TVDE_BASELINE"


def _database_hostname(url: str) -> str:
    normalized = url.strip()
    normalized = normalized.replace("postgresql+psycopg2://", "postgresql://", 1)
    normalized = normalized.replace("postgresql+psycopg://", "postgresql://", 1)
    normalized = normalized.replace("postgres+psycopg2://", "postgres://", 1)
    host = urlparse(normalized).hostname
    return (host or "").lower()


def _assert_database_allowed(database_url: str) -> None:
    hostname = _database_hostname(database_url)
    if hostname in _LOCAL_HOSTS:
        return
    allow = (os.environ.get("ALLOW_REMOTE_BASELINE_WIPE") or "").strip().upper()
    if allow == "YES":
        print(
            f"WARNING: remote baseline wipe allowed via ALLOW_REMOTE_BASELINE_WIPE=YES "
            f"(host={hostname or '(unknown)'}).",
            file=sys.stderr,
        )
        return
    print(
        f"Refusing baseline wipe against non-local database "
        f"(host={hostname or '(unknown)'}). "
        "Use local DATABASE_URL, or set ALLOW_REMOTE_BASELINE_WIPE=YES "
        "only for intentional remote wipe.",
        file=sys.stderr,
    )
    raise SystemExit(2)


def main() -> None:
    parser = argparse.ArgumentParser(description="TRUNCATE app tables + baseline seed.")
    parser.add_argument(
        "--confirm",
        required=True,
        help=f"Tem de ser exactamente: {_CONFIRM}",
    )
    args = parser.parse_args()
    if args.confirm != _CONFIRM:
        print(f"Recusado: passa --confirm {_CONFIRM}", file=sys.stderr)
        sys.exit(2)

    from dotenv import load_dotenv

    load_dotenv(dotenv_path=_BACKEND_ROOT / ".env")

    from app.core.config import settings
    from app.db.session import SessionLocal
    from app.services.baseline_reset import assert_baseline_state, run_full_baseline_reset

    database_url = settings.DATABASE_URL or os.environ.get("DATABASE_URL") or ""
    if not database_url.strip():
        print("DATABASE_URL em falta.", file=sys.stderr)
        sys.exit(2)
    _assert_database_allowed(database_url)

    if settings.is_production_environment():
        allow = (os.environ.get("ALLOW_REMOTE_BASELINE_WIPE") or "").strip().upper()
        if allow != "YES":
            print(
                "Refusing: production environment detected "
                "(ENV/ENVIRONMENT is prod/production). "
                "Set ALLOW_REMOTE_BASELINE_WIPE=YES only for intentional remote wipe.",
                file=sys.stderr,
            )
            sys.exit(2)

    db = SessionLocal()
    try:
        out = run_full_baseline_reset(db)
        assert_baseline_state(db)
        print(out)
    finally:
        db.close()


if __name__ == "__main__":
    main()
