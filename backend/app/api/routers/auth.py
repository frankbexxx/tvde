import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_current_user, get_db
from app.core.config import settings
from app.auth.passwords import hash_password, verify_password
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
    MeProfilePatchRequest,
    MeProfileResponse,
    OtpRequest,
    OtpRequestResponse,
    OtpVerifyRequest,
    PasswordChangeRequest,
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

    admin_phone = getattr(settings, "ADMIN_PHONE", None)
    is_admin_phone = bool(admin_phone and _normalize_phone(admin_phone) == phone)

    user = db.execute(select(User).where(User.phone == phone)).scalar_one_or_none()
    if not user:
        if is_admin_phone:
            user = User(
                role=Role.super_admin,
                name=phone,
                phone=phone,
                status=UserStatus.active,
            )
            db.add(user)
        elif _is_beta():
            # Partner fleet managers are created only via POST /admin/partners/{id}/create-admin,
            # never through public OTP (Role.partner is intentionally excluded here).
            req_role_raw = (payload.requested_role or "").strip().lower()
            req_role = req_role_raw or "passenger"
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

    # Telefone = ADMIN_PHONE: sessão super_admin (novo ou existente; corrige passenger/admin legado).
    if is_admin_phone:
        user.role = Role.super_admin
        user.status = UserStatus.active

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
        display_name=(user.name or "").strip(),
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """BETA: login with phone + default password. No OTP required."""
    if not _is_beta():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Not available"
        )

    phone = _normalize_phone(payload.phone)
    if not BETA_PHONE_REGEX.match(phone):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="BETA: apenas números portugueses (+351XXXXXXXXX)",
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
                role=Role.super_admin,
                name=phone,
                phone=phone,
                status=UserStatus.active,
            )
            db.add(user)
        else:
            # Same rule as OTP: no public signup path for Role.partner.
            req_role = (payload.requested_role or "passenger").strip().lower()
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

    if user.password_hash:
        if not verify_password(payload.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="invalid_credentials",
            )
    else:
        if payload.password != getattr(settings, "DEFAULT_PASSWORD", "123456"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="invalid_credentials",
            )

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

    admin_phone_login = getattr(settings, "ADMIN_PHONE", None)
    if admin_phone_login and _normalize_phone(admin_phone_login) == phone:
        user.role = Role.super_admin
        user.status = UserStatus.active
        db.commit()
        db.refresh(user)

    token_data = create_access_token(subject=str(user.id), role=user.role.value)

    return TokenResponse(
        access_token=token_data["token"],
        token_type=OAUTH_ACCESS_TOKEN_TYPE,
        user_id=str(user.id),
        role=user.role,
        expires_at=token_data["expires_at"],
        display_name=(user.name or "").strip(),
    )


def _me_profile_from_user(u: User) -> MeProfileResponse:
    return MeProfileResponse(
        user_id=str(u.id),
        phone=u.phone,
        name=(u.name or "").strip(),
        has_custom_password=bool(u.password_hash),
    )


@router.get("/me", response_model=MeProfileResponse)
async def get_my_profile(
    user_ctx: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MeProfileResponse:
    """BETA: dados mínimos da conta para o ecrã (M1)."""
    if not _is_beta():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Not available"
        )
    try:
        uid = uuid.UUID(user_ctx.user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_user_id"
        )
    user = db.execute(select(User).where(User.id == uid)).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="user_not_found"
        )
    return _me_profile_from_user(user)


@router.patch("/me", response_model=MeProfileResponse)
async def patch_my_profile(
    payload: MeProfilePatchRequest,
    user_ctx: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MeProfileResponse:
    """BETA: alterar nome visível (M1). Telefone só via admin."""
    if not _is_beta():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Not available"
        )
    try:
        uid = uuid.UUID(user_ctx.user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_user_id"
        )
    user = db.execute(select(User).where(User.id == uid)).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="user_not_found"
        )
    user.name = payload.name.strip()[:120]
    db.commit()
    db.refresh(user)
    return _me_profile_from_user(user)


@router.post("/me/password")
async def change_my_password(
    payload: PasswordChangeRequest,
    user_ctx: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Define ou altera a palavra-passe (BETA). Com hash existente, current_password é obrigatório."""
    if not _is_beta():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Not available"
        )
    try:
        uid = uuid.UUID(user_ctx.user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_user_id"
        )
    user = db.execute(select(User).where(User.id == uid)).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="user_not_found"
        )

    if user.password_hash:
        if not payload.current_password or not verify_password(
            payload.current_password, user.password_hash
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="invalid_current_password",
            )
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"status": "ok"}
