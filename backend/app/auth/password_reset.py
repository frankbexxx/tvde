"""Prova curta de recuperação. Não é um access token e não escolhe papel."""

from __future__ import annotations

import hashlib
import hmac
from datetime import datetime, timezone

from app.core.config import settings

_PURPOSE = "password_reset"


def issue_password_reset_proof(*, otp_id: str, user_id: str, expires_at: datetime) -> str:
    exp = int(expires_at.timestamp())
    body = f"{otp_id}.{user_id}.{exp}"
    sig = hmac.new(
        settings.OTP_SECRET.encode("utf-8"),
        f"{_PURPOSE}:{body}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"{body}.{sig}"


def read_password_reset_proof(token: str, *, now: datetime | None = None) -> tuple[str, str] | None:
    """Devolve (otp_id, user_id) se a assinatura e o prazo forem válidos."""
    parts = (token or "").split(".")
    if len(parts) != 4:
        return None
    otp_id, user_id, exp_raw, sig = parts
    if not otp_id or not user_id or not sig:
        return None
    body = f"{otp_id}.{user_id}.{exp_raw}"
    expected = hmac.new(
        settings.OTP_SECRET.encode("utf-8"),
        f"{_PURPOSE}:{body}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, sig):
        return None
    try:
        exp = int(exp_raw)
    except ValueError:
        return None
    current = now or datetime.now(timezone.utc)
    if exp < int(current.timestamp()):
        return None
    return otp_id, user_id
