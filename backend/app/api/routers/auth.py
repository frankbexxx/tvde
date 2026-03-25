import re
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.auth.otp import (
    generate_otp_code,
    hash_otp_code,
    otp_expiration_time,
    verify_otp_code,
)
from app.auth.security import create_access_token
from app.db.models.otp import OtpCode
from app.db.models.user import User
from app.models.enums import Role, UserStatus
from app.schemas.auth import (
    LoginRequest,
    OtpRequest,
    OtpRequestResponse,
    OtpVerifyRequest,
    TokenResponse,
)


router = APIRouter(prefix="/auth", tags=["auth"])

BETA_PHONE_REGEX = re.compile(r"^\+351\d{9}$")
# OAuth 2.0 token type (RFC 6749); not a credential.
OAUTH_ACCESS_TOKEN_TYPE = "bearer"  # nosec B105


def _normalize_phone(phone: str) -> str:
    return phone.strip()


def _is_beta() -> bool:
    return getattr(settings, "BETA_MODE", False)


@router.post("/otp/request", response_model=OtpRequestResponse)
async def request_otp(
    payload: OtpRequest,
    db: Session = Depends(get_db),
) -> OtpRequestResponse:
    phone = _normalize_phone(payload.phone)
    if _is_beta():
        if not BETA_PHONE_REGEX.match(phone):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="BETA: apenas números portugueses (+351XXXXXXXXX)",
            )
        count = db.execute(select(func.count()).select_from(User)).scalar() or 0
        if count >= settings.MAX_BETA_USERS:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="BETA cheio",
            )

    code = generate_otp_code()
    if settings.ENV == "dev" or getattr(settings, "ENABLE_DEV_TOOLS", False):
        print(f"[OTP] phone={phone} code={code}")
    expires_at = otp_expiration_time()
    code_hash = hash_otp_code(phone, code)

    otp = OtpCode(
        phone=phone,
        code_hash=code_hash,
        expires_at=expires_at,
    )
    db.add(otp)
    db.commit()

    return OtpRequestResponse(request_id=str(otp.id), expires_at=expires_at)


@router.post("/otp/verify", response_model=TokenResponse)
async def verify_otp(
    payload: OtpVerifyRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    now = datetime.now(timezone.utc)
    phone = _normalize_phone(payload.phone)
    otp: Optional[OtpCode] = db.execute(
        select(OtpCode)
        .where(
            OtpCode.phone == phone,
            OtpCode.consumed_at.is_(None),
            OtpCode.expires_at > now,
        )
        .order_by(OtpCode.created_at.desc())
        .limit(1)
    ).scalar_one_or_none()

    if not otp or not verify_otp_code(phone, payload.code, otp.code_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_otp",
        )

    otp.consumed_at = now

    user = db.execute(select(User).where(User.phone == phone)).scalar_one_or_none()
    if not user:
        admin_phone = getattr(settings, "ADMIN_PHONE", None)
        if _is_beta() and admin_phone and _normalize_phone(admin_phone) == phone:
            user = User(
                role=Role.admin,
                name=phone,
                phone=phone,
                status=UserStatus.active,
            )
            db.add(user)
        elif _is_beta():
            req_role = (payload.requested_role or "passenger").lower()
            if req_role not in ("passenger", "driver"):
                req_role = "passenger"
            user = User(
                role=Role.passenger,
                name=phone,
                phone=phone,
                status=UserStatus.pending,
                requested_role=req_role,
            )
            db.add(user)
        else:
            user = User(
                role=Role.passenger,
                name=phone,
                phone=phone,
                status=UserStatus.active,
            )
            db.add(user)

    if user.status == UserStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="pending_approval",
        )
    if user.status != UserStatus.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="blocked",
        )

    db.commit()
    db.refresh(user)

    token_data = create_access_token(subject=str(user.id), role=user.role.value)

    return TokenResponse(
        access_token=token_data["token"],
        token_type=OAUTH_ACCESS_TOKEN_TYPE,
        user_id=str(user.id),
        role=user.role,
        expires_at=token_data["expires_at"],
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """BETA: login with phone + default password. No OTP required."""
    if not _is_beta():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not available")

    phone = _normalize_phone(payload.phone)
    if not BETA_PHONE_REGEX.match(phone):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="BETA: apenas números portugueses (+351XXXXXXXXX)",
        )
    if payload.password != getattr(settings, "DEFAULT_PASSWORD", "123456"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_credentials",
        )

    user = db.execute(select(User).where(User.phone == phone)).scalar_one_or_none()
    if not user:
        count = db.execute(select(func.count()).select_from(User)).scalar() or 0
        if count >= settings.MAX_BETA_USERS:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="BETA cheio",
            )
        admin_phone = getattr(settings, "ADMIN_PHONE", None)
        if admin_phone and _normalize_phone(admin_phone) == phone:
            user = User(
                role=Role.admin,
                name=phone,
                phone=phone,
                status=UserStatus.active,
            )
            db.add(user)
        else:
            req_role = (payload.requested_role or "passenger").lower()
            if req_role not in ("passenger", "driver"):
                req_role = "passenger"
            user = User(
                role=Role.passenger,
                name=phone,
                phone=phone,
                status=UserStatus.pending,
                requested_role=req_role,
            )
            db.add(user)
        db.commit()
        db.refresh(user)

    if user.status == UserStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="pending_approval",
        )
    if user.status != UserStatus.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="blocked",
        )

    token_data = create_access_token(subject=str(user.id), role=user.role.value)

    return TokenResponse(
        access_token=token_data["token"],
        token_type=OAUTH_ACCESS_TOKEN_TYPE,
        user_id=str(user.id),
        role=user.role,
        expires_at=token_data["expires_at"],
    )
