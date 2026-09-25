"""Google OAuth2 (authorization code) — troca de code por id_token e validação."""

from __future__ import annotations

import base64
import hashlib
import logging
import os
from typing import Any

import httpx
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.core.config import settings

logger = logging.getLogger(__name__)

# Well-known Google OAuth2 token endpoint (not a credential).
_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"  # nosec B105

_DEFAULT_REDIRECT_URIS = frozenset(
    {
        "http://localhost:5173/auth/google/callback",
        "http://127.0.0.1:5173/auth/google/callback",
        "https://tvde-app-j51f.onrender.com/auth/google/callback",
    }
)


def allowed_google_redirect_uris() -> frozenset[str]:
    """Redirects fixos. O cliente não pode escolher um URI arbitrário."""
    extra = os.getenv("GOOGLE_OAUTH_REDIRECT_URIS", "")
    found: set[str] = set(_DEFAULT_REDIRECT_URIS)
    for part in extra.split(","):
        item = part.strip()
        if item:
            found.add(item)
    return frozenset(found)


def assert_allowed_google_redirect(redirect_uri: str) -> str:
    uri = redirect_uri.strip()
    if uri not in allowed_google_redirect_uris():
        raise RuntimeError("google_redirect_not_allowed")
    return uri


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


def assert_id_token_nonce(claims: dict[str, Any], nonce: str) -> None:
    """O id_token tem de estar ligado ao nonce que a app acabou de gerar.

    O Credential Manager no Android ecoa o nonce que recebe. A app passa
    SHA-256(rawNonce) ao plugin e envia o raw ao backend. Comparar o claim
    com o nonce enviado deixaria passar quem só copiasse o hash que já vem
    dentro do token.
    """
    expected = nonce.strip()
    got = str(claims.get("nonce") or "")
    if not expected or not got:
        raise RuntimeError("google_nonce_mismatch")
    digest = hashlib.sha256(expected.encode("utf-8")).digest()
    hex_digest = digest.hex()
    b64_digest = base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")
    if got != hex_digest and got != b64_digest:
        raise RuntimeError("google_nonce_mismatch")
