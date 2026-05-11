"""Google OAuth2 (authorization code) — troca de code por id_token e validação."""

from __future__ import annotations

import logging
from typing import Any

import httpx
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.core.config import settings

logger = logging.getLogger(__name__)

# Well-known Google OAuth2 token endpoint (not a credential).
_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"  # nosec B105


async def exchange_code_for_id_token(*, code: str, redirect_uri: str) -> dict[str, Any]:
    """POST code → Google token endpoint; devolve payload JSON (deve incluir id_token)."""
    client_id = (getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", None) or "").strip()
    client_secret = (getattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", None) or "").strip()
    if not client_id or not client_secret:
        raise RuntimeError("google_oauth_not_configured")

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            _GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    try:
        data = response.json()
    except Exception:
        data = {}
    if response.status_code >= 400:
        logger.warning(
            "Google token exchange failed: status=%s body=%s",
            response.status_code,
            (response.text or "")[:500],
        )
        raise RuntimeError("google_token_exchange_failed")
    id_tok = data.get("id_token")
    if not id_tok or not isinstance(id_tok, str):
        raise RuntimeError("google_no_id_token")
    return {"id_token": id_tok, "raw": data}


def verify_id_token_claims(id_token_jwt: str) -> dict[str, Any]:
    """Valida assinatura e audience; devolve claims (sub, email, email_verified, name, …)."""
    client_id = (getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", None) or "").strip()
    if not client_id:
        raise RuntimeError("google_oauth_not_configured")
    request = google_requests.Request()
    info = id_token.verify_oauth2_token(id_token_jwt, request, client_id)
    if not isinstance(info, dict):
        raise RuntimeError("google_invalid_token")
    return info
