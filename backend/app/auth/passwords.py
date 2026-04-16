"""Palavra-passe opcional por utilizador (BETA: bcrypt)."""

from __future__ import annotations

import bcrypt

MIN_PASSWORD_LEN = 8


def hash_password(plain: str) -> str:
    h = bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(rounds=12))
    return h.decode("ascii")


def verify_password(plain: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), password_hash.encode("ascii"))
    except ValueError:
        return False
