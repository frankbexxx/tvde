"""Cifra do sucessor de refresh. A chave não é derivada de um segredo fraco."""

from __future__ import annotations

import base64
import json
import secrets
from typing import Any

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings

SUCCESSOR_AAD = b"vamula-refresh-successor-v1"
_WEAK_VALUES = frozenset(
    {
        "changeme",
        "secret",
        "password",
        "test",
        "dev",
        "default",
        "dev-jwt-secret-key-at-least-32-characters-long",
        "dev-otp-secret-key-at-least-32-characters-long",
    }
)


class InsecureRefreshKey(Exception):
    """A configuração não pode cifrar sucessores."""


class SuccessorUnreadable(Exception):
    """O ciphertext não abre com a chave actual."""


def require_refresh_key() -> bytes:
    raw = settings.REFRESH_SUCCESSOR_KEY
    if raw is None:
        raise InsecureRefreshKey
    value = raw.strip()
    if not value or value.lower() in _WEAK_VALUES:
        raise InsecureRefreshKey
    jwt_secret = (settings.JWT_SECRET_KEY or "").strip()
    otp_secret = (settings.OTP_SECRET or "").strip()
    if value == jwt_secret or value == otp_secret:
        raise InsecureRefreshKey
    try:
        key = base64.urlsafe_b64decode(value)
    except Exception as exc:
        raise InsecureRefreshKey from exc
    if len(key) != 32 or len(set(key)) < 8:
        raise InsecureRefreshKey
    return key


def encrypt_successor(payload: dict[str, Any]) -> bytes:
    key = require_refresh_key()
    nonce = secrets.token_bytes(12)
    body = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    ciphertext = AESGCM(key).encrypt(nonce, body, SUCCESSOR_AAD)
    return nonce + ciphertext


def decrypt_successor(blob: bytes) -> dict[str, Any]:
    key = require_refresh_key()
    if len(blob) <= 12:
        raise SuccessorUnreadable
    try:
        raw = AESGCM(key).decrypt(blob[:12], blob[12:], SUCCESSOR_AAD)
    except InvalidTag as exc:
        raise SuccessorUnreadable from exc
    data = json.loads(raw.decode("utf-8"))
    if not isinstance(data, dict) or not isinstance(data.get("refresh_token"), str):
        raise SuccessorUnreadable
    return data
