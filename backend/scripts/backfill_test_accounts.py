#!/usr/bin/env python3
"""Mark existing users as test accounts and set bcrypt hash from TEST_ACCOUNT_PASSWORD.

Run once per environment after deploying the is_test_account migration.

  cd backend
  $env:DATABASE_URL = "postgresql+psycopg2://..."
  $env:ADMIN_PHONE = "+351924075365"
  $env:TEST_ACCOUNT_PASSWORD = "demo1234"
  python scripts/backfill_test_accounts.py --confirm MARK_EXISTING_AS_TEST
  python scripts/backfill_test_accounts.py --confirm MARK_EXISTING_AS_TEST --dry-run
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))


def run_backfill(*, dry_run: bool) -> dict[str, int | list[str]]:
    from sqlalchemy import select

    from app.auth.passwords import hash_password
    from app.core.config import settings
    from app.db.models.user import User
    from app.db.session import SessionLocal

    admin_phone = settings.ADMIN_PHONE
    if not admin_phone or not str(admin_phone).strip():
        raise SystemExit("ADMIN_PHONE must be set in the environment")
    real_phone = _normalize_phone(str(admin_phone))
    test_password = settings.resolved_test_account_password()
    test_hash = hash_password(test_password)

    session = SessionLocal()
    try:
        users = list(session.execute(select(User)).scalars().all())
        if not users:
            return {"total": 0, "test": 0, "real": 0, "real_phones": []}

        real_phones: list[str] = []
        test_count = 0
        for user in users:
            phone = _normalize_phone(user.phone)
            if phone == real_phone:
                user.is_test_account = False
                real_phones.append(phone)
            else:
                user.is_test_account = True
                user.password_hash = test_hash
                test_count += 1

        if dry_run:
            session.rollback()
        else:
            session.commit()

        return {
            "total": len(users),
            "test": test_count,
            "real": len(real_phones),
            "real_phones": real_phones,
        }
    finally:
        session.close()


def _normalize_phone(phone: str) -> str:
    return phone.strip()


def main() -> None:
    from app.core.config import settings

    parser = argparse.ArgumentParser(
        description="Backfill is_test_account and test password hashes."
    )
    parser.add_argument(
        "--confirm",
        required=True,
        help="Must be exactly MARK_EXISTING_AS_TEST",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without committing",
    )
    args = parser.parse_args()
    if args.confirm != "MARK_EXISTING_AS_TEST":
        raise SystemExit("Invalid --confirm value")

    if settings.is_production_environment() and args.dry_run is False:
        if not settings.ADMIN_PHONE:
            raise SystemExit("Refusing to run in production without ADMIN_PHONE")

    result = run_backfill(dry_run=args.dry_run)
    mode = "DRY-RUN" if args.dry_run else "APPLIED"
    print(f"[{mode}] users total={result['total']} test={result['test']} real={result['real']}")
    if result["real_phones"]:
        print(f"[{mode}] real account phone(s): {', '.join(result['real_phones'])}")


if __name__ == "__main__":
    main()
