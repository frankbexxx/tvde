from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import jwt

from app.core.config import settings


def create_access_token(*, subject: str, role: str) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_MINUTES)
    payload = {"sub": subject, "role": role, "iat": now, "exp": expire}
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return {"token": token, "expires_at": expire}


def decode_access_token(token: str) -> Dict[str, Any]:
    """Valida assinatura, exp (obrigatório) e sub (obrigatório)."""
    return jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
        options={"require": ["exp", "sub"]},
    )

