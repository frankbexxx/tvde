"""Rotação atómica de refresh tokens. O caller confirma a transacção."""

from __future__ import annotations

import hashlib
import hmac
import re
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session

from app.auth.refresh_crypto import (
    InsecureRefreshKey,
    SuccessorUnreadable,
    decrypt_successor,
    encrypt_successor,
    require_refresh_key,
)
from app.auth.security import create_access_token
from app.db.models.auth_session import AuthRefreshToken, AuthSessionFamily
from app.db.models.user import User
from app.models.enums import Role, UserStatus

ClientType = Literal["web", "android"]
REFRESH_CONTRACT = "refresh-v1"
REUSE_GRACE = timedelta(seconds=30)
LOCK_TIMEOUT = "2s"
STATUS_ACTIVE = "active"
STATUS_ROTATED = "rotated"
STATUS_REVOKED = "revoked"
_TIMEOUT_RE = re.compile(r"^[0-9]{1,5}(ms|s)$")

_POLICIES: dict[Role, tuple[timedelta, timedelta]] = {
    Role.driver: (timedelta(hours=4), timedelta(hours=18)),
    Role.passenger: (timedelta(hours=24), timedelta(days=14)),
    Role.partner: (timedelta(hours=12), timedelta(days=7)),
    Role.admin: (timedelta(hours=8), timedelta(hours=12)),
    Role.super_admin: (timedelta(hours=8), timedelta(hours=12)),
}


@dataclass(frozen=True)
class IssuedSession:
    refresh_token: str
    family_id: uuid.UUID
    token_id: uuid.UUID


@dataclass(frozen=True)
class RefreshOutcome:
    kind: str
    payload: dict[str, Any] | None = None
    commit: bool = False


def policy_for(role: Role | str) -> tuple[timedelta, timedelta]:
    """Devolve (inactividade, prazo absoluto)."""
    try:
        return _POLICIES[Role(role)]
    except ValueError as exc:
        raise ValueError("unsupported_session_role") from exc


def digest(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _now(now: datetime | None) -> datetime:
    current = now or datetime.now(timezone.utc)
    if current.tzinfo is None:
        return current.replace(tzinfo=timezone.utc)
    return current


def _aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def issue_session(
    db: Session,
    user: User,
    *,
    client_type: ClientType,
    now: datetime | None = None,
) -> IssuedSession:
    """Cria uma família para testes e para o AUTH-2. Não faz commit."""
    if client_type not in ("web", "android"):
        raise ValueError("unsupported_client_type")
    idle, absolute = policy_for(user.role)
    current = _now(now)
    secret = secrets.token_urlsafe(32)
    family_id = uuid.uuid4()
    token_id = uuid.uuid4()
    db.add(
        AuthSessionFamily(
            id=family_id,
            user_id=user.id,
            role=user.role.value,
            client_type=client_type,
            token_version=int(user.token_version or 0),
            created_at=current,
            absolute_expires_at=current + absolute,
        )
    )
    db.flush()
    db.add(
        AuthRefreshToken(
            id=token_id,
            family_id=family_id,
            token_hash=digest(secret),
            generation=1,
            status=STATUS_ACTIVE,
            created_at=current,
            idle_expires_at=current + idle,
        )
    )
    db.flush()
    return IssuedSession(
        refresh_token=secret, family_id=family_id, token_id=token_id
    )


def purge_expired_successor_ciphertexts(
    db: Session, *, now: datetime | None = None
) -> int:
    current = _now(now)
    rows = db.execute(
        select(AuthRefreshToken).where(
            AuthRefreshToken.status != STATUS_ACTIVE,
            AuthRefreshToken.successor_ciphertext.is_not(None),
            AuthRefreshToken.successor_retain_until.is_not(None),
            AuthRefreshToken.successor_retain_until <= current,
        )
    ).scalars()
    count = 0
    for row in rows:
        row.successor_ciphertext = None
        count += 1
    return count


def revoke_user_families(
    db: Session,
    user_id: uuid.UUID,
    *,
    reason: str,
    now: datetime | None = None,
) -> int:
    """Revoga todas as famílias da conta. Não faz commit."""
    current = _now(now)
    _set_lock_timeout(db)
    families = list(
        db.execute(
            select(AuthSessionFamily)
            .where(
                AuthSessionFamily.user_id == user_id,
                AuthSessionFamily.revoked_at.is_(None),
            )
            .order_by(AuthSessionFamily.id)
        ).scalars()
    )
    for family in families:
        _lock_family_tokens(db, family.id)
        _revoke_family(db, family, reason=reason, now=current)
    return len(families)


def begin_refresh(
    db: Session,
    *,
    refresh_token: str,
    idempotency_key: str,
    client_type: ClientType,
    now: datetime | None = None,
) -> RefreshOutcome:
    """Roda ou recupera o sucessor. Só persiste quando o caller faz commit."""
    try:
        require_refresh_key()
    except InsecureRefreshKey:
        return RefreshOutcome(kind="unavailable")

    current = _now(now)
    try:
        locked = _lock_presented(db, refresh_token)
    except OperationalError as exc:
        db.rollback()
        if _is_lock_timeout(exc):
            return RefreshOutcome(kind="unavailable")
        raise
    if locked is None:
        return RefreshOutcome(kind="invalid_grant")
    family, row = locked
    if family.client_type != client_type:
        return RefreshOutcome(kind="invalid_grant")

    user = db.get(User, family.user_id)
    if user is None or family.revoked_at is not None or row.status == STATUS_REVOKED:
        return RefreshOutcome(kind="invalid_grant")

    if row.status == STATUS_ROTATED:
        return _replay_or_reuse(
            db,
            row=row,
            family=family,
            user=user,
            idempotency_key=idempotency_key,
            now=current,
        )

    if int(family.token_version) != int(user.token_version or 0):
        _revoke_family(db, family, reason="token_version", now=current)
        return RefreshOutcome(kind="invalid_grant", commit=True)
    if user.status != UserStatus.active:
        _revoke_family(db, family, reason="blocked", now=current)
        return RefreshOutcome(kind="invalid_grant", commit=True)
    if current >= _aware(family.absolute_expires_at) or current >= _aware(
        row.idle_expires_at
    ):
        _revoke_family(db, family, reason="expired", now=current)
        return RefreshOutcome(kind="session_expired", commit=True)

    try:
        payload = _rotate(
            db,
            row=row,
            family=family,
            user=user,
            idempotency_key=idempotency_key,
            now=current,
        )
    except (InsecureRefreshKey, IntegrityError):
        db.rollback()
        return RefreshOutcome(kind="unavailable")
    return RefreshOutcome(kind="ok", payload=payload, commit=True)


def logout_family(
    db: Session,
    *,
    refresh_token: str,
    client_type: ClientType,
    now: datetime | None = None,
) -> RefreshOutcome:
    current = _now(now)
    try:
        locked = _lock_presented(db, refresh_token)
    except OperationalError as exc:
        db.rollback()
        if _is_lock_timeout(exc):
            return RefreshOutcome(kind="unavailable")
        raise
    if locked is None:
        return RefreshOutcome(kind="invalid_grant")
    family, _row = locked
    if family.client_type != client_type:
        return RefreshOutcome(kind="invalid_grant")
    if family.revoked_at is None:
        _revoke_family(db, family, reason="logout", now=current)
        return RefreshOutcome(kind="ok", commit=True)
    return RefreshOutcome(kind="ok")


def _replay_or_reuse(
    db: Session,
    *,
    row: AuthRefreshToken,
    family: AuthSessionFamily,
    user: User,
    idempotency_key: str,
    now: datetime,
) -> RefreshOutcome:
    stored_key = row.idempotency_key_hash or ""
    presented_key = digest(idempotency_key)
    same_key = len(stored_key) == len(presented_key) and hmac.compare_digest(
        stored_key, presented_key
    )
    retained = (
        same_key
        and row.successor_ciphertext is not None
        and row.successor_retain_until is not None
        and _aware(row.successor_retain_until) > now
    )
    if not retained:
        _revoke_family(db, family, reason="reuse", now=now)
        return RefreshOutcome(kind="invalid_grant", commit=True)
    if not _family_still_usable(family, user, now):
        reason = "expired" if now >= _aware(family.absolute_expires_at) else "blocked"
        if int(family.token_version) != int(user.token_version or 0):
            reason = "token_version"
        _revoke_family(db, family, reason=reason, now=now)
        kind = "session_expired" if reason == "expired" else "invalid_grant"
        return RefreshOutcome(kind=kind, commit=True)
    try:
        payload = decrypt_successor(bytes(row.successor_ciphertext or b""))
    except (SuccessorUnreadable, InsecureRefreshKey):
        db.rollback()
        return RefreshOutcome(kind="unavailable")
    return RefreshOutcome(kind="ok", payload=payload)


def _family_still_usable(family: AuthSessionFamily, user: User, now: datetime) -> bool:
    if user.status != UserStatus.active:
        return False
    if int(family.token_version) != int(user.token_version or 0):
        return False
    return now < _aware(family.absolute_expires_at)


def _rotate(
    db: Session,
    *,
    row: AuthRefreshToken,
    family: AuthSessionFamily,
    user: User,
    idempotency_key: str,
    now: datetime,
) -> dict[str, Any]:
    idle, _absolute = policy_for(family.role)
    secret = secrets.token_urlsafe(32)
    successor_id = uuid.uuid4()
    # Sai do índice de token activo antes de nascer o sucessor.
    row.status = STATUS_ROTATED
    row.rotated_at = now
    row.idempotency_key_hash = digest(idempotency_key)
    db.flush()
    successor = AuthRefreshToken(
        id=successor_id,
        family_id=family.id,
        token_hash=digest(secret),
        generation=int(row.generation) + 1,
        status=STATUS_ACTIVE,
        created_at=now,
        idle_expires_at=now + idle,
    )
    db.add(successor)
    db.flush()
    access = create_access_token(
        subject=str(user.id),
        role=user.role.value,
        token_version=int(user.token_version or 0),
    )
    expires_at = access["expires_at"]
    payload = {
        "access_token": access["token"],
        "token_type": "bearer",
        "user_id": str(user.id),
        "role": user.role.value,
        "expires_at": expires_at.isoformat(),
        "expires_in": max(0, int((expires_at - now).total_seconds())),
        "display_name": (user.name or "").strip(),
        "phone": (user.phone or "").strip(),
        "session_id": str(family.id),
        "refresh_token": secret,
        "absolute_expires_at": _aware(family.absolute_expires_at).isoformat(),
    }
    row.replaced_by_id = successor.id
    row.successor_ciphertext = encrypt_successor(payload)
    row.successor_retain_until = now + REUSE_GRACE
    db.flush()
    return payload


def _revoke_family(
    db: Session,
    family: AuthSessionFamily,
    *,
    reason: str,
    now: datetime,
) -> None:
    if family.revoked_at is None:
        family.revoked_at = now
        family.revoke_reason = reason[:32]
    tokens = _lock_family_tokens(db, family.id)
    for token in tokens:
        token.status = STATUS_REVOKED
        token.successor_ciphertext = None


def _lock_presented(
    db: Session, refresh_token: str
) -> tuple[AuthSessionFamily, AuthRefreshToken] | None:
    token_hash = digest(refresh_token)
    family_id = db.execute(
        select(AuthRefreshToken.family_id).where(
            AuthRefreshToken.token_hash == token_hash
        )
    ).scalar_one_or_none()
    if family_id is None:
        return None
    _set_lock_timeout(db)
    family = db.execute(
        select(AuthSessionFamily)
        .where(AuthSessionFamily.id == family_id)
        .with_for_update()
    ).scalar_one()
    tokens = _lock_family_tokens(db, family.id)
    row = next((token for token in tokens if token.token_hash == token_hash), None)
    if row is None:
        return None
    return family, row


def _lock_family_tokens(db: Session, family_id: uuid.UUID) -> list[AuthRefreshToken]:
    return list(
        db.execute(
            select(AuthRefreshToken)
            .where(AuthRefreshToken.family_id == family_id)
            .order_by(AuthRefreshToken.id)
            .with_for_update()
        ).scalars()
    )


def _set_lock_timeout(db: Session) -> None:
    timeout = LOCK_TIMEOUT if _TIMEOUT_RE.fullmatch(LOCK_TIMEOUT) else "2s"
    # Valor limitado ao padrão acima. SET LOCAL não aceita parâmetro.
    db.execute(text(f"SET LOCAL lock_timeout = '{timeout}'"))  # nosec B608


def _is_lock_timeout(exc: OperationalError) -> bool:
    orig = getattr(exc, "orig", None)
    if getattr(orig, "pgcode", None) == "55P03":
        return True
    return "lock timeout" in str(orig or exc).lower()
