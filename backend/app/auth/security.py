from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import jwt

from app.core.config import settings

TOKEN_VERSION_CLAIM = "token_version"  # nosec B105  # JWT claim name, not a password
STRONG_AUTH_PURPOSE = "strong_auth"
STRONG_AUTH_MINUTES = 10


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
    """Valida assinatura, exp (obrigatório) e sub (obrigatório).

    Uma prova ``purpose=strong_auth`` não é sessão. Rejeita-a aqui para
    nenhum caller a tratar como access token.
    """
    payload = jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
        options={"require": ["exp", "sub"]},
    )
    if payload.get("purpose") == STRONG_AUTH_PURPOSE:
        raise jwt.InvalidTokenError("strong_auth_not_access")
    return payload


def create_strong_auth_proof(
    *, user_id: str, token_version: int, access_iat: int
) -> Dict[str, Any]:
    """Prova curta ligada ao JWT que a pediu. Não substitui o access token."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=STRONG_AUTH_MINUTES)
    payload = {
        "sub": str(user_id),
        "user_id": str(user_id),
        "token_version": int(token_version),
        "purpose": STRONG_AUTH_PURPOSE,
        "access_iat": int(access_iat),
        "iat": now,
        "exp": expire,
    }
    token = jwt.encode(
        payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    return {"token": token, "expires_at": expire}


def verify_strong_auth_proof(
    token: str, *, user_id: str, token_version: int, access_iat: int
) -> bool:
    """A prova vale só para este user, esta versão e o ``iat`` deste access JWT."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"require": ["exp", "sub"]},
        )
    except jwt.InvalidTokenError:
        return False
    if payload.get("purpose") != STRONG_AUTH_PURPOSE:
        return False
    if str(payload.get("user_id")) != str(user_id):
        return False
    try:
        if int(payload.get(TOKEN_VERSION_CLAIM)) != int(token_version):
            return False
        if int(payload.get("access_iat")) != int(access_iat):
            return False
    except (TypeError, ValueError):
        return False
    return True


def token_version_from_claims(payload: Dict[str, Any]) -> int:
    """Legacy JWTs without the claim are treated as version 0 (rollout compat)."""
    raw = payload.get(TOKEN_VERSION_CLAIM, 0)
    try:
        return int(raw)
    except (TypeError, ValueError):
        return -1


def token_version_matches(*, payload: Dict[str, Any], user_token_version: int) -> bool:
    return token_version_from_claims(payload) == int(user_token_version)
