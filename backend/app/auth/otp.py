import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from app.core.config import settings


def generate_otp_code(length: int = 6) -> str:
    min_value = 10 ** (length - 1)
    max_value = (10**length) - 1
    if getattr(settings, "ENABLE_DEV_TOOLS", False):
        return "123456"  # Beta: código fixo para testadores
    return str(secrets.randbelow(max_value - min_value + 1) + min_value)


def hash_otp_code(phone: str, code: str) -> str:
    message = f"{phone}:{code}".encode("utf-8")
    return hmac.new(
        settings.OTP_SECRET.encode("utf-8"), message, hashlib.sha256
    ).hexdigest()


def verify_otp_code(phone: str, code: str, code_hash: str) -> bool:
    expected = hash_otp_code(phone, code)
    return hmac.compare_digest(expected, code_hash)


def otp_expiration_time() -> datetime:
    return datetime.now(timezone.utc) + timedelta(
        minutes=settings.OTP_EXPIRATION_MINUTES
    )
