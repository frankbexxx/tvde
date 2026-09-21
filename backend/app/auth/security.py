from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import jwt

from app.core.config import settings

TOKEN_VERSION_CLAIM = "token_version"  # nosec B105  # JWT claim name, not a password


def create_access_token(
    *, subject: str, role: str, token_version: int = 0
) -> Dict[str, Any]:
    """Emit access JWT. ``token_version`` must match ``User.token_version`` (L-SEC-13)."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_MINUTES)
    payload = {
        "sub": subject,
        "role": role,
        "iat": now,
        "exp": expire,
        TOKEN_VERSION_CLAIM: int(token_version),
    }
    token = jwt.encode(
        payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    return {"token": token, "expires_at": expire}


def decode_access_token(token: str) -> Dict[str, Any]:
    """Valida assinatura, exp (obrigatório) e sub (obrigatório)."""
    return jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
        options={"require": ["exp", "sub"]},
    )


def token_version_from_claims(payload: Dict[str, Any]) -> int:
    """Legacy JWTs without the claim are treated as version 0 (rollout compat)."""
    raw = payload.get(TOKEN_VERSION_CLAIM, 0)
    try:
        return int(raw)
    except (TypeError, ValueError):
        return -1


def token_version_matches(*, payload: Dict[str, Any], user_token_version: int) -> bool:
    return token_version_from_claims(payload) == int(user_token_version)
