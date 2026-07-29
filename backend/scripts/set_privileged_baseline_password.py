#!/usr/bin/env python3
"""Set a private password on privileged baseline accounts (admin / partner).

One-off ops helper after #504. Never uses TEST_ACCOUNT_PASSWORD. Never touches
Frank / super_admin. Does not mark accounts as is_test_account.

  cd backend
  python scripts/set_privileged_baseline_password.py

Interactive: phone → confirm → getpass ×2 → Commit na BD? [yes]
"""

from __future__ import annotations

import getpass
import sys
from pathlib import Path
from typing import Any

_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

FRANK_PHONE = "+351924075365"

# Role values (str) — Role enum imported lazily to keep ruff E402 clean after sys.path.
ALLOWED_TARGETS: dict[str, str] = {
    "+351900000000": "admin",
    "+351955555502": "partner",
}


class Abort(RuntimeError):
    """Safe abort — message must never include passwords or hashes."""


def normalize_phone(phone: str) -> str:
    return phone.strip()


def expected_role_for_phone(phone: str) -> Any:
    from app.models.enums import Role

    normalized = normalize_phone(phone)
    if normalized == FRANK_PHONE:
        raise Abort("ABORT: não alterar conta Frank/super_admin")
    expected_value = ALLOWED_TARGETS.get(normalized)
    if expected_value is None:
        raise Abort("ABORT: telefone fora da allowlist")
    return Role(expected_value)


def reject_demo_password(password: str, demo_password: str | None) -> None:
    if demo_password is not None and password == demo_password:
        raise Abort("ABORT: não usar TEST_ACCOUNT_PASSWORD nestas contas")


def reject_short_password(password: str) -> None:
    from app.auth.passwords import MIN_PASSWORD_LEN

    if len(password) < MIN_PASSWORD_LEN:
        raise Abort(f"ABORT: mínimo {MIN_PASSWORD_LEN} caracteres")


def apply_privileged_password(
    user: Any,
    *,
    phone: str,
    password: str,
    demo_password: str | None,
) -> dict[str, str | bool]:
    """Mutate ``user`` in-memory: set hash + is_test_account=False.

    Raises ``Abort`` on policy violations. Does not commit.
    """
    from app.auth.passwords import hash_password, verify_password
    from app.models.enums import Role

    normalized = normalize_phone(phone)
    expected = expected_role_for_phone(normalized)

    if normalize_phone(getattr(user, "phone", "") or "") != normalized:
        raise Abort("ABORT: phone mismatch vs user row")

    if getattr(user, "role", None) == Role.super_admin:
        raise Abort("ABORT: super_admin / Frank fora de âmbito")

    if user.role != expected:
        raise Abort(
            f"ABORT: role mismatch (db={user.role.value} expected={expected.value})"
        )

    reject_short_password(password)
    reject_demo_password(password, demo_password)

    user.password_hash = hash_password(password)
    user.is_test_account = False

    if not verify_password(password, user.password_hash):
        raise Abort("ABORT: verify_password falhou após hash")
    if user.is_test_account is not False:
        raise Abort("ABORT: is_test_account não ficou false")

    return {
        "phone": normalized,
        "role": user.role.value,
        "is_test_account": False,
        "password_set": True,
    }


def _resolve_demo_password() -> str | None:
    from app.core.config import settings

    try:
        return settings.resolved_test_account_password()
    except Exception:
        return None


def run_interactive() -> None:
    from sqlalchemy import select

    from app.db.models.user import User
    from app.db.session import SessionLocal

    phone = normalize_phone(input("Phone E.164 (alvo): "))
    expected = expected_role_for_phone(phone)

    confirm = input(
        f"Confirmar set password para {phone} role={expected.value}? [yes]: "
    ).strip()
    if confirm != "yes":
        raise SystemExit("ABORT: confirmação cancelada")

    pwd = getpass.getpass("New password (no echo): ")
    pwd2 = getpass.getpass("Repeat password: ")
    if pwd != pwd2:
        raise SystemExit("ABORT: passwords não coincidem")

    demo = _resolve_demo_password()
    session = SessionLocal()
    try:
        user = session.execute(
            select(User).where(User.phone == phone)
        ).scalar_one_or_none()
        if user is None:
            raise SystemExit("ABORT: user não encontrado")

        result = apply_privileged_password(
            user,
            phone=phone,
            password=pwd,
            demo_password=demo,
        )
        session.flush()

        apply = input("Commit na BD? [yes]: ").strip()
        if apply != "yes":
            session.rollback()
            raise SystemExit("ROLLBACK: sem commit")

        session.commit()
        print(
            f"[APPLIED] phone={result['phone']} role={result['role']} "
            f"is_test_account={result['is_test_account']} password_set=yes"
        )
    except Abort as exc:
        session.rollback()
        raise SystemExit(str(exc)) from exc
    except SystemExit:
        session.rollback()
        raise
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
        pwd = pwd2 = demo = None  # noqa: F841


def main() -> None:
    run_interactive()


if __name__ == "__main__":
    main()
