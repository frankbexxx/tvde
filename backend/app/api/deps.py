from typing import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from jwt.exceptions import InvalidTokenError

from app.auth.security import decode_access_token
from app.db.models.user import User
from app.db.session import SessionLocal
from app.models.enums import Role, UserStatus


# auto_error=False: missing Bearer would otherwise yield 403 (Starlette HTTPBearer default).
# get_current_user raises 401 for missing/invalid credentials (A012).
bearer_scheme = HTTPBearer(scheme_name="BearerAuth", auto_error=False)
bearer_scheme_optional = HTTPBearer(scheme_name="BearerAuth", auto_error=False)


class UserContext(BaseModel):
    """Session context. partner_id is derived from DB (driver.partner_id or user.partner_org_id)."""

    user_id: str
    role: Role
    partner_id: str | None = None


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> UserContext:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="not_authenticated",
        )
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_token",
        ) from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_token",
        )

    user = (
        db.execute(
            select(User)
            .where(User.id == user_id)
            .options(
                joinedload(User.driver_profile),
            )
        )
        .unique()
        .scalar_one_or_none()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_token",
        )
    if user.status != UserStatus.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="blocked",
        )

    partner_scope: str | None = None
    if user.role == Role.driver and user.driver_profile is not None:
        partner_scope = str(user.driver_profile.partner_id)
    elif user.role == Role.partner and user.partner_org_id is not None:
        partner_scope = str(user.partner_org_id)

    return UserContext(
        user_id=str(user.id),
        role=user.role,
        partner_id=partner_scope,
    )


async def get_current_admin(
    user: UserContext = Depends(get_current_user),
) -> UserContext:
    """Admin only: authentication is handled by get_current_user; this step is role-only → 403."""
    if user.role != Role.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="forbidden",
        )
    return user


def require_role(*roles: Role):
    """Admin-only routes use get_current_admin (auth → get_current_user, then role → 403)."""
    if frozenset(roles) == frozenset({Role.admin}):

        async def _admin_only(
            admin: UserContext = Depends(get_current_admin),
        ) -> UserContext:
            return admin

        return _admin_only

    async def _require(user: UserContext = Depends(get_current_user)) -> UserContext:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="forbidden",
            )
        return user

    return _require


async def get_current_partner(
    user: UserContext = Depends(get_current_user),
) -> UserContext:
    """Partner-only: must have role partner and a resolved tenant (partner_org_id)."""
    if user.role != Role.partner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="forbidden",
        )
    if not user.partner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="partner_org_required",
        )
    return user


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme_optional),
    db: Session = Depends(get_db),
) -> UserContext | None:
    """Returns user if valid Bearer token present; else None (for anonymous lifecycle logs)."""
    if not credentials:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = payload.get("sub")
        if not user_id:
            return None
        user = (
            db.execute(
                select(User)
                .where(User.id == user_id)
                .options(joinedload(User.driver_profile))
            )
            .unique()
            .scalar_one_or_none()
        )
        if not user or user.status != UserStatus.active:
            return None
        partner_scope: str | None = None
        if user.role == Role.driver and user.driver_profile is not None:
            partner_scope = str(user.driver_profile.partner_id)
        elif user.role == Role.partner and user.partner_org_id is not None:
            partner_scope = str(user.partner_org_id)
        return UserContext(
            user_id=str(user.id),
            role=user.role,
            partner_id=partner_scope,
        )
    except InvalidTokenError:
        return None
