"""A023: JWT decode (exp/sub), sem PostgreSQL."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt
import pytest
from jwt.exceptions import InvalidTokenError

from app.auth.security import create_access_token, decode_access_token
from app.core.config import settings


def test_create_access_token_includes_exp_and_sub() -> None:
    out = create_access_token(subject="user-uuid-1", role="passenger")
    payload = jwt.decode(
        out["token"],
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
        options={"verify_signature": True},
    )
    assert payload["sub"] == "user-uuid-1"
    assert payload["role"] == "passenger"
    assert "exp" in payload


def test_decode_rejects_expired_token() -> None:
    past = datetime.now(timezone.utc) - timedelta(seconds=30)
    token = jwt.encode(
        {"sub": "u1", "exp": past},
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    with pytest.raises(InvalidTokenError):
        decode_access_token(token)


def test_decode_requires_sub() -> None:
    token = jwt.encode(
        {"exp": datetime.now(timezone.utc) + timedelta(minutes=5)},
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    with pytest.raises(InvalidTokenError):
        decode_access_token(token)


def test_decode_rejects_bad_signature() -> None:
    token = jwt.encode(
        {
            "sub": "u1",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        },
        "not-the-real-secret-at-least-32-bytes-xx",
        algorithm=settings.JWT_ALGORITHM,
    )
    with pytest.raises(InvalidTokenError):
        decode_access_token(token)
