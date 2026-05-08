#!/usr/bin/env python3
"""Wipe DB + seed baseline roster — local or Render (``DATABASE_URL``).

O router ``POST /dev/baseline-reset`` **não** está montado em ``ENVIRONMENT=prod``;
para igualar a BD alojada, corre este script com a connection string do Render.

  cd backend
  # Windows PowerShell:
  $env:DATABASE_URL = "postgresql+psycopg://..."
  python scripts/baseline_reset.py --confirm WIPE_ALL_TVDE_BASELINE

Requer pacote instalado (ou venv activo) e Postgres acessível.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))


def main() -> None:
    parser = argparse.ArgumentParser(description="TRUNCATE app tables + baseline seed.")
    parser.add_argument(
        "--confirm",
        required=True,
        help='Tem de ser exactamente: WIPE_ALL_TVDE_BASELINE',
    )
    args = parser.parse_args()
    if args.confirm != "WIPE_ALL_TVDE_BASELINE":
        print("Recusado: passa --confirm WIPE_ALL_TVDE_BASELINE", file=sys.stderr)
        sys.exit(2)

    from dotenv import load_dotenv

    load_dotenv(dotenv_path=_BACKEND_ROOT / ".env")

    from app.db.session import SessionLocal
    from app.services.baseline_reset import assert_baseline_state, run_full_baseline_reset

    db = SessionLocal()
    try:
        out = run_full_baseline_reset(db)
        assert_baseline_state(db)
        print(out)
    finally:
        db.close()


if __name__ == "__main__":
    main()
