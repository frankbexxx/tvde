"""POST /auth/refresh e POST /auth/logout. O login emite refresh só com refresh-v1."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.auth.refresh_sessions import (
    REFRESH_CONTRACT,
    TOKEN_TYPE_BEARER,
    RefreshOutcome,
    begin_refresh,
    issue_session,
    logout_family,
    purge_expired_successor_ciphertexts,
)
from app.db.models.auth_session import AuthSessionFamily
from app.db.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])

COOKIE_NAME = "vamula_refresh"
_PUBLIC_FIELDS = (
    "access_token",
    "token_type",
    "user_id",
    "role",
    "expires_at",
    "expires_in",
    "display_name",
    "phone",
    "session_id",
)


def requested_refresh_client(request: Request) -> str | None:
    """None = cliente legado. Cabeçalho parcial ou inválido não emite sessão."""
    contract = request.headers.get("x-auth-contract")
    client = request.headers.get("x-auth-client")
    if contract is None and client is None:
        return None
    if contract != REFRESH_CONTRACT or client not in ("web", "android"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="auth_contract_required",
        )
    return client


def refresh_login_response(
    db: Session,
    user: User,
    token_data: dict,
    client: str,
) -> JSONResponse:
    """Cria a família e só depois escreve a resposta. O segredo não vai para o log."""
    issued = issue_session(db, user, client_type=client)  # type: ignore[arg-type]
    family = db.get(AuthSessionFamily, issued.family_id)
    if family is None:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="refresh_unavailable",
        )
    absolute = family.absolute_expires_at
    secret = issued.refresh_token
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="refresh_unavailable",
        ) from exc
    expires_at = token_data["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    body = {
        "access_token": token_data["token"],
        "token_type": TOKEN_TYPE_BEARER,
        "user_id": str(user.id),
        "role": user.role.value,
        "expires_at": expires_at.isoformat(),
        "expires_in": max(0, int((expires_at - now).total_seconds())),
        "display_name": (user.name or "").strip(),
        "phone": (user.phone or "").strip(),
        "session_id": str(issued.family_id),
    }
    if client == "android":
        body["refresh_token"] = secret
    response = JSONResponse(body)
    if client == "web":
        _set_refresh_cookie(
            response,
            {
                "refresh_token": secret,
                "absolute_expires_at": absolute.isoformat(),
            },
        )
    return _no_store(response)


def _client_type(
    contract: str | None, client: str | None
) -> str:
    if contract != REFRESH_CONTRACT or client not in ("web", "android"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="auth_contract_required",
        )
    return client


def _json_object(request_body: bytes) -> dict:
    if not request_body:
        return {}
    try:
        parsed = json.loads(request_body)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_body"
        ) from exc
    if not isinstance(parsed, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_body"
        )
    return parsed


def _idempotency_key(body: dict) -> str:
    raw = body.get("idempotency_key")
    if not isinstance(raw, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="idempotency_key_required",
        )
    try:
        return str(uuid.UUID(raw))
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="idempotency_key_required",
        ) from exc


def _presented_token(client: str, body: dict, request: Request) -> str:
    if client == "android":
        token = body.get("refresh_token")
        if not isinstance(token, str) or not token or len(token) > 512:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="refresh_token_required",
            )
        return token
    token = request.cookies.get(COOKIE_NAME, "")
    if not token or len(token) > 512:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_grant"
        )
    return token


def _no_store(response: Response) -> Response:
    response.headers["Cache-Control"] = "no-store"
    return response


def _fail(outcome: RefreshOutcome) -> None:
    if outcome.kind == "unavailable":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="refresh_unavailable",
        )
    if outcome.kind == "session_expired":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="session_expired"
        )
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_grant"
    )


def _persist(db: Session, outcome: RefreshOutcome) -> None:
    try:
        if outcome.commit:
            db.commit()
        else:
            db.rollback()
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="refresh_unavailable",
        ) from exc


def _public_body(payload: dict, client: str) -> dict:
    body = {key: payload[key] for key in _PUBLIC_FIELDS}
    if client == "android":
        body["refresh_token"] = payload["refresh_token"]
    return body


def _set_refresh_cookie(response: Response, payload: dict) -> None:
    absolute = datetime.fromisoformat(payload["absolute_expires_at"])
    if absolute.tzinfo is None:
        absolute = absolute.replace(tzinfo=timezone.utc)
    remaining = int((absolute - datetime.now(timezone.utc)).total_seconds())
    response.set_cookie(
        key=COOKIE_NAME,
        value=payload["refresh_token"],
        max_age=max(0, remaining),
        path="/auth",
        secure=True,
        httponly=True,
        samesite="lax",
    )


@router.post("/refresh")
async def refresh_session(
    request: Request,
    db: Session = Depends(get_db),
    x_auth_contract: str | None = Header(default=None),
    x_auth_client: str | None = Header(default=None),
):
    client = _client_type(x_auth_contract, x_auth_client)
    body = _json_object(await request.body())
    idempotency_key = _idempotency_key(body)
    refresh_token = _presented_token(client, body, request)
    purge_expired_successor_ciphertexts(db)
    db.commit()
    outcome = begin_refresh(
        db,
        refresh_token=refresh_token,
        idempotency_key=idempotency_key,
        client_type=client,  # type: ignore[arg-type]
    )
    if outcome.kind != "ok":
        _persist(db, outcome)
        _fail(outcome)
    _persist(db, outcome)
    response = JSONResponse(_public_body(outcome.payload or {}, client))
    if client == "web":
        _set_refresh_cookie(response, outcome.payload or {})
    return _no_store(response)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout_session(
    request: Request,
    db: Session = Depends(get_db),
    x_auth_contract: str | None = Header(default=None),
    x_auth_client: str | None = Header(default=None),
):
    client = _client_type(x_auth_contract, x_auth_client)
    body = _json_object(await request.body())
    refresh_token = _presented_token(client, body, request)
    outcome = logout_family(
        db,
        refresh_token=refresh_token,
        client_type=client,  # type: ignore[arg-type]
    )
    if outcome.kind != "ok":
        _persist(db, outcome)
        _fail(outcome)
    _persist(db, outcome)
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    if client == "web":
        response.delete_cookie(
            key=COOKIE_NAME,
            path="/auth",
            secure=True,
            httponly=True,
            samesite="lax",
        )
    return _no_store(response)
