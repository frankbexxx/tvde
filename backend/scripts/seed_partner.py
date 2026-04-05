#!/usr/bin/env python3
"""DEV: create 1 partner, 2 drivers (with locations), 1 partner org admin.

Run from backend directory:
  python scripts/seed_partner.py

Requires ENV=dev or ENABLE_DEV_TOOLS=true and a reachable DATABASE_URL.
"""
from __future__ import annotations

import sys
from pathlib import Path

# Allow `python scripts/seed_partner.py` without installing the package.
_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))


def main() -> None:
    from app.core.config import settings

    env = getattr(settings, "ENV", "")
    if env != "dev" and not getattr(settings, "ENABLE_DEV_TOOLS", False):
        print(
            "Refused: set ENV=dev or ENABLE_DEV_TOOLS=true to run this seed.",
            file=sys.stderr,
        )
        sys.exit(1)

    from app.db.session import SessionLocal
    from app.services.seed_partner_dev import run_partner_pilot_seed

    db = SessionLocal()
    try:
        out = run_partner_pilot_seed(db)
        print(out)
    finally:
        db.close()


if __name__ == "__main__":
    main()
