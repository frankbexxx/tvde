import re
import uuid
from datetime import datetime, timezone
from typing import Optional

import anyio
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select, update
from sqlalchemy.engine import CursorResult
from sqlalchemy.exc import IntegrityError
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
    assert_allowed_google_redirect,
    assert_id_token_nonce,
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
from app.services.beta_capacity import active_beta_user_count
from app.db.models.user_legal_acceptance import LegalAcceptanceSource
from app.services.legal_acceptance import (
    LOGIN_REACCEPT,
    record_acceptance,
    status_payload,
)
from app.schemas.auth import (
    GoogleExchangeRequest,
    GoogleIdTokenRequest,
    GoogleOnboardingRequest,
    LegalAcceptanceRequest,
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
# Shared demo / is_test_account password must never authenticate privileged roles.
_PRIVILEGED_TEST_LOGIN_ROLES = frozenset({Role.admin, Role.super_admin, Role.partner})


def _normalize_phone(phone: str) -> str:
    return phone.strip()


def _pt_phone_ok(phone: str) -> bool:
    return bool(BETA_PHONE_REGEX.match(phone))


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


def _reject_otp_when_deployed() -> None:
    """OTP code stays for a future SMS track. Deployed has no delivery channel."""
    if settings.is_deployed_environment():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="otp_auth_unavailable",
        )


def claim_unconsumed_otp(db: Session, otp_id: uuid.UUID, now: datetime) -> bool:
    """Mark one OTP consumed. A concurrent verify updates zero rows and loses."""
    result = db.execute(
        update(OtpCode)
        .where(
            OtpCode.id == otp_id,
            OtpCode.consumed_at.is_(None),
            OtpCode.expires_at > now,
        )
        .values(consumed_at=now)
    )
    if not isinstance(result, CursorResult):
        return False
    return int(result.rowcount or 0) == 1


@router.post("/otp/request", response_model=OtpRequestResponse)
async def request_otp(
    payload: OtpRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> OtpRequestResponse:
    _reject_otp_when_deployed()
    phone = _normalize_phone(payload.phone)
    check_otp_request_rate_limit(request, phone)
    if settings.enforce_pt_phone():
        if not _pt_phone_ok(phone):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="BETA: apenas números portugueses (+351XXXXXXXXX)",
            )
    if settings.require_pending_approval():
        if active_beta_user_count(db) >= settings.MAX_BETA_USERS:
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
    _reject_otp_when_deployed()
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

    user = db.execute(select(User).where(User.phone == phone)).scalar_one_or_none()
    creating = user is None
    if creating and not payload.accept_legal:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="legal_acceptance_required",
        )

    if not claim_unconsumed_otp(db, otp.id, now):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_otp",
        )

    if creating:
        if settings.require_pending_approval():
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
        db.flush()
        record_acceptance(db, user.id, LegalAcceptanceSource.register_otp)

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

    token_data = create_access_token(
        subject=str(user.id),
        role=user.role.value,
        token_version=int(user.token_version),
    )

    return _token_response(user, token_data)


def _verify_login_password(user: User, password: str) -> None:
    if user.is_test_account and user.role in _PRIVILEGED_TEST_LOGIN_ROLES:
        # Defense in depth: privileged roles must never authenticate via shared demo hashes.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_credentials",
        )
    if user.is_test_account:
        if not settings.enable_demo_users():
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


@router.get("/legal-acceptance")
def get_legal_acceptance(
    user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str | bool]:
    return status_payload(db, uuid.UUID(user.user_id))


@router.post("/legal-acceptance")
def post_legal_acceptance(
    payload: LegalAcceptanceRequest,
    user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str | bool]:
    if payload.source != LOGIN_REACCEPT.value:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="invalid_legal_acceptance_source",
        )
    uid = uuid.UUID(user.user_id)
    record_acceptance(db, uid, LOGIN_REACCEPT)
    db.commit()
    return status_payload(db, uid)


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Login existente com phone + password (independente de BETA_MODE)."""
    phone = _normalize_phone(payload.phone)
    check_beta_login_rate_limit(request, phone)
    if settings.enforce_pt_phone() and not _pt_phone_ok(phone):
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

    token_data = create_access_token(
        subject=str(user.id),
        role=user.role.value,
        token_version=int(user.token_version),
    )

    return _token_response(user, token_data)


def _is_google_passenger_onboarding(user: User) -> bool:
    """Passageiro Google ainda sem telefone real nem sessão. Não é fila de Admin."""
    return (
        user.role == Role.passenger
        and user.status == UserStatus.pending
        and user.requested_role == "passenger"
        and bool((user.oauth_google_sub or "").strip())
    )


def _raise_google_onboarding_required(
    user: User,
    email: str,
    *,
    id_token: str | None = None,
) -> None:
    detail: dict[str, str] = {
        "code": "google_onboarding_required",
        "name": (user.name or "").strip()[:120],
        "email": email,
    }
    # O redirect web consome o authorization code. O id_token fica só na
    # resposta deste passo para a página o reenviar em memória. O login
    # nativo já o tem e não o recebe aqui.
    if id_token:
        detail["id_token"] = id_token
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=detail,
    )


def _normalize_onboarding_phone(phone: str) -> str:
    compact = re.sub(r"[\s\-()]", "", (phone or "").strip())
    if compact.startswith("00351"):
        compact = "+" + compact[2:]
    elif compact.startswith("351") and not compact.startswith("+"):
        compact = "+" + compact
    elif re.fullmatch(r"\d{9}", compact):
        compact = "+351" + compact
    if not BETA_PHONE_REGEX.fullmatch(compact):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_phone_format",
        )
    return compact


def _session_from_google_claims(
    db: Session,
    claims: dict,
    *,
    echo_id_token: str | None = None,
) -> TokenResponse:
    name = str(claims.get("name") or "").strip()[:120]
    sub = str(claims.get("sub") or "").strip()
    email = str(claims.get("email") or "").strip().lower()
    if not name:
        name = email.split("@", 1)[0][:120]

    user = db.execute(
        select(User).where(User.oauth_google_sub == sub)
    ).scalar_one_or_none()

    if user is None:
        by_email = db.execute(
            select(User).where(func.lower(User.email) == email)
        ).scalar_one_or_none()
        if by_email is not None:
            if by_email.oauth_google_sub and by_email.oauth_google_sub != sub:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="google_account_conflict",
                )
            if by_email.role != Role.passenger:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="google_only_passenger_role",
                )
            if by_email.status == UserStatus.blocked:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="blocked",
                )
            if by_email.status == UserStatus.pending:
                # OTP / fila Admin. Não ligar o Google nem abrir onboarding.
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="pending_approval",
                )
            if by_email.status != UserStatus.active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="blocked",
                )
            by_email.oauth_google_sub = sub
            if not by_email.email:
                by_email.email = email
            db.commit()
            db.refresh(by_email)
            user = by_email

    if user is None:
        if active_beta_user_count(db) >= settings.MAX_BETA_USERS:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="BETA cheio",
            )
        user = User(
            role=Role.passenger,
            name=name,
            phone=_synthetic_phone_google_sub(sub),
            email=email,
            oauth_google_sub=sub,
            status=UserStatus.pending,
            requested_role="passenger",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        _raise_google_onboarding_required(user, email, id_token=echo_id_token)

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
    if user.status == UserStatus.blocked:
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="blocked",
        )
    if _is_google_passenger_onboarding(user):
        db.commit()
        _raise_google_onboarding_required(user, email, id_token=echo_id_token)
    if user.status == UserStatus.pending:
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
    token_data = create_access_token(
        subject=str(user.id),
        role=user.role.value,
        token_version=int(user.token_version),
    )
    return _token_response(user, token_data)


def _complete_google_passenger_onboarding(
    db: Session,
    claims: dict,
    *,
    name: str,
    phone: str,
    accept_legal: bool,
) -> TokenResponse:
    sub = str(claims.get("sub") or "").strip()
    email = str(claims.get("email") or "").strip().lower()
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="google_invalid_sub"
        )
    if not email or not bool(claims.get("email_verified")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="google_email_not_verified",
        )
    if not accept_legal:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="legal_acceptance_required",
        )
    cleaned_name = name.strip()[:120]
    if not cleaned_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_name",
        )
    normalized_phone = _normalize_onboarding_phone(phone)

    user = db.execute(
        select(User).where(User.oauth_google_sub == sub)
    ).scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="google_onboarding_not_found",
        )
    if user.role != Role.passenger:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="google_only_passenger_role",
        )
    if user.email and user.email.lower() != email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="google_email_mismatch",
        )
    if user.status == UserStatus.blocked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="blocked",
        )
    if user.requested_role == "driver" or not _is_google_passenger_onboarding(user):
        if user.status == UserStatus.pending:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="pending_approval",
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="google_onboarding_not_pending",
        )

    taken = db.execute(
        select(User.id).where(User.phone == normalized_phone, User.id != user.id).limit(1)
    ).first()
    if taken:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="phone_already_used",
        )
    if active_beta_user_count(db) >= settings.MAX_BETA_USERS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="BETA cheio",
        )

    user.name = cleaned_name
    user.phone = normalized_phone
    if not user.email:
        user.email = email
    user.status = UserStatus.active
    user.requested_role = None
    record_acceptance(db, user.id, LegalAcceptanceSource.register_google)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="phone_already_used",
        ) from None
    db.refresh(user)
    token_data = create_access_token(
        subject=str(user.id),
        role=user.role.value,
        token_version=int(user.token_version),
    )
    return _token_response(user, token_data)


@router.post("/google/exchange", response_model=TokenResponse)
async def google_exchange(
    payload: GoogleExchangeRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """`GOOGLE_OAUTH_*`: troca `code` por JWT (v1 só passageiro). Independente de BETA_MODE."""
    check_google_exchange_rate_limit(request)
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
        redirect_uri = assert_allowed_google_redirect(payload.redirect_uri)
        tok_pack = await exchange_code_for_id_token(
            code=payload.code.strip(),
            redirect_uri=redirect_uri,
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

    return _session_from_google_claims(
        db, claims, echo_id_token=tok_pack["id_token"]
    )


@router.post("/google/id-token", response_model=TokenResponse)
async def google_id_token(
    payload: GoogleIdTokenRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Login nativo: valida o id_token da Google. Não aceita redirect do cliente."""
    check_google_exchange_rate_limit(request)
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
        claims = await anyio.to_thread.run_sync(
            verify_id_token_claims, payload.id_token.strip()
        )
        assert_id_token_nonce(claims, payload.nonce)
    except RuntimeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="google_token_invalid",
        ) from None
    sub = str(claims.get("sub") or "").strip()
    email = str(claims.get("email") or "").strip().lower()
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="google_invalid_sub"
        )
    if not email or not bool(claims.get("email_verified")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="google_email_not_verified",
        )
    return _session_from_google_claims(db, claims)


@router.post("/google/onboarding", response_model=TokenResponse)
async def google_onboarding(
    payload: GoogleOnboardingRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Conclui o passageiro Google. Revalida o id_token. Não emite JWT antes disso."""
    check_google_exchange_rate_limit(request)
    if not _google_oauth_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="google_oauth_disabled",
        )
    try:
        claims = await anyio.to_thread.run_sync(
            verify_id_token_claims, payload.id_token.strip()
        )
        raw_nonce = (payload.nonce or "").strip()
        claim_nonce = str(claims.get("nonce") or "")
        if raw_nonce or claim_nonce:
            assert_id_token_nonce(claims, raw_nonce)
    except RuntimeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="google_token_invalid",
        ) from None
    return _complete_google_passenger_onboarding(
        db,
        claims,
        name=payload.name,
        phone=payload.phone,
        accept_legal=payload.accept_legal,
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
    """Dados mínimos da conta (M1). Independente de BETA_MODE."""
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
    """Alterar nome visível (M1). Telefone só via admin. Independente de BETA_MODE."""
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
    """Define ou altera a palavra-passe. Com hash existente, current_password é obrigatório."""
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
    user.token_version = int(user.token_version or 0) + 1
    db.commit()
    return {"status": "ok"}
