import re
import uuid
from datetime import datetime, timezone
from typing import Optional

import anyio
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.auth_rate_limit import (
    check_beta_login_rate_limit,
    check_google_exchange_rate_limit,
    check_otp_request_rate_limit,
    check_otp_verify_rate_limit,
)
from app.api.deps import UserContext, get_current_user, get_db
from app.core.config import settings
from app.auth.google_oauth import (
    exchange_code_for_id_token,
    verify_id_token_claims,
)
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
    GoogleExchangeRequest,
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


def _google_oauth_configured() -> bool:
    cid = (getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", None) or "").strip()
    csec = (getattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", None) or "").strip()
    return bool(cid and csec)


def _synthetic_phone_google_sub(sub: str) -> str:
    s = (sub or "").strip()
    if not s:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="google_invalid_sub"
        )
    body = s[:31]
    return f"g{body}"


def _token_response(user: User, token_data: dict) -> TokenResponse:
    return TokenResponse(
        access_token=token_data["token"],
        token_type=OAUTH_ACCESS_TOKEN_TYPE,
        user_id=str(user.id),
        role=user.role,
        expires_at=token_data["expires_at"],
        display_name=(user.name or "").strip(),
        phone=(user.phone or "").strip(),
    )


@router.post("/otp/request", response_model=OtpRequestResponse)
async def request_otp(
    payload: OtpRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> OtpRequestResponse:
    phone = _normalize_phone(payload.phone)
    check_otp_request_rate_limit(request, phone)
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
    if settings.dev_tools_router_enabled():
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
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    now = datetime.now(timezone.utc)
    phone = _normalize_phone(payload.phone)
    check_otp_verify_rate_limit(request, phone)
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
        # The pending account is the durable signup request shown in the admin queue.
        db.commit()
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

    return _token_response(user, token_data)


def _verify_login_password(user: User, password: str) -> None:
    if user.is_test_account:
        if not _is_beta():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="test_account_disabled",
            )
        if not user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="test_account_password_not_set",
            )
        if not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="invalid_credentials",
            )
        return
    if not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="password_not_set",
        )
    if not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_credentials",
        )


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """BETA: login existing users with phone + password. No OTP required."""
    if not _is_beta():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Not available"
        )

    phone = _normalize_phone(payload.phone)
    check_beta_login_rate_limit(request, phone)
    if not BETA_PHONE_REGEX.match(phone):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="BETA: apenas números portugueses (+351XXXXXXXXX)",
        )
    user = db.execute(select(User).where(User.phone == phone)).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_credentials",
        )

    _verify_login_password(user, payload.password)

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

    return _token_response(user, token_data)


@router.post("/google/exchange", response_model=TokenResponse)
async def google_exchange(
    payload: GoogleExchangeRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """BETA + `GOOGLE_OAUTH_*`: troca `code` por JWT (v1 só passageiro)."""
    check_google_exchange_rate_limit(request)
    if not _is_beta():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Not available"
        )
    if not _google_oauth_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="google_oauth_disabled",
        )

    req_role = (payload.requested_role or "passenger").strip().lower()
    if req_role != "passenger":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="google_login_passenger_only",
        )

    try:
        tok_pack = await exchange_code_for_id_token(
            code=payload.code.strip(),
            redirect_uri=payload.redirect_uri.strip(),
        )
        claims = await anyio.to_thread.run_sync(
            verify_id_token_claims, tok_pack["id_token"]
        )
    except RuntimeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="google_exchange_failed",
        ) from None
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="google_token_invalid",
        ) from None

    sub = str(claims.get("sub") or "").strip()
    email = str(claims.get("email") or "").strip().lower()
    verified = bool(claims.get("email_verified"))
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="google_invalid_sub"
        )
    if not email or not verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="google_email_not_verified",
        )

    name = str(claims.get("name") or email.split("@", 1)[0]).strip()[:120]

    user = db.execute(
        select(User).where(User.oauth_google_sub == sub)
    ).scalar_one_or_none()

    if user is None:
        user = db.execute(
            select(User).where(func.lower(User.email) == email)
        ).scalar_one_or_none()
        if user is not None:
            if user.oauth_google_sub and user.oauth_google_sub != sub:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="google_account_conflict",
                )
            user.oauth_google_sub = sub

    if user is None:
        count = db.execute(select(func.count()).select_from(User)).scalar() or 0
        if count >= settings.MAX_BETA_USERS:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="BETA cheio",
            )
        phone_syn = _synthetic_phone_google_sub(sub)
        user = User(
            role=Role.passenger,
            name=name,
            phone=phone_syn,
            email=email,
            oauth_google_sub=sub,
            status=UserStatus.pending,
            requested_role="passenger",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if user.role != Role.passenger:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="google_only_passenger_role",
            )
        if not user.email:
            user.email = email
        elif user.email.lower() != email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="google_email_mismatch",
            )
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
    return _token_response(user, token_data)


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
