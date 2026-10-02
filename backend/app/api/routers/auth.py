import re
import uuid
from datetime import datetime, timezone
from typing import Optional

import anyio
import jwt
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
from app.auth.security import (
    create_access_token,
    create_strong_auth_proof,
    decode_access_token,
    verify_strong_auth_proof,
)
from app.db.models.otp import OtpCode
from app.db.models.user import User
from app.db.models.user_identity import UserIdentity
from app.models.enums import Role, UserStatus
from app.services.beta_capacity import active_beta_user_count
from app.services.user_identities import (
    ACTIVE_IDENTITY_LIMIT,
    IdentityEmailTaken,
    IdentityLimitReached,
    IdentityManageError,
    IdentitySubjectTaken,
    add_google_login_identity,
    attach_google_identity,
    list_login_identities,
    lookup_identity_by_email,
    lookup_identity_by_google_subject,
    make_identity_primary,
    record_identity_event,
    revoke_login_identity,
    sync_known_google_email,
)
from app.db.models.user_legal_acceptance import LegalAcceptanceSource
from app.services.legal_acceptance import (
    LOGIN_REACCEPT,
    acceptance_required,
    record_acceptance,
    status_payload,
)
from app.schemas.auth import (
    GoogleExchangeRequest,
    GoogleIdTokenRequest,
    GoogleLinkRequest,
    GoogleOnboardingRequest,
    LegalAcceptanceRequest,
    LoginRequest,
    AddGoogleIdentityRequest,
    IdentityItemResponse,
    IdentityListResponse,
    IdentityMutationResponse,
    IdentityStepUpRequest,
    MeProfilePatchRequest,
    MeProfileResponse,
    OtpRequest,
    OtpRequestResponse,
    OtpVerifyRequest,
    PasswordChangeRequest,
    ReauthRequest,
    ReauthResponse,
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


def _is_google_passenger_onboarding(db: Session, user: User) -> bool:
    """Passageiro Google ainda sem telefone real nem sessão. Não é fila de Admin."""
    if not (
        user.role == Role.passenger
        and user.status == UserStatus.pending
        and user.requested_role == "passenger"
    ):
        return False
    identity_id = db.execute(
        select(UserIdentity.id).where(
            UserIdentity.user_id == user.id,
            UserIdentity.provider == "google",
            UserIdentity.revoked_at.is_(None),
        )
    ).scalar_one_or_none()
    return identity_id is not None


def _raise_google_account_choice(
    name: str,
    email: str,
    *,
    id_token: str | None = None,
) -> None:
    """Google válido sem identity. Não cria User."""
    detail: dict[str, str] = {
        "code": "google_account_choice_required",
        "name": name,
        "email": email,
    }
    if id_token:
        detail["id_token"] = id_token
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=detail,
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

    identity = lookup_identity_by_google_subject(db, sub)
    if identity is not None and identity.revoked_at is not None:
        record_identity_event(
            db,
            event_type="identity_login",
            user_id=identity.user_id,
            identity_id=identity.id,
            provider="google",
            result="revoked",
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="identity_revoked",
        )
    if identity is None:
        _raise_google_account_choice(name, email, id_token=echo_id_token)

    user = db.get(User, identity.user_id)
    if user is None:
        _raise_google_account_choice(name, email, id_token=echo_id_token)
    try:
        sync_known_google_email(db, user, identity, email)
    except IdentityEmailTaken:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="google_email_mismatch",
        ) from None
    if user.status == UserStatus.blocked:
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="blocked",
        )
    if _is_google_passenger_onboarding(db, user):
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

    record_identity_event(
        db,
        event_type="identity_login",
        user_id=user.id,
        identity_id=identity.id,
        provider="google",
        result="ok",
    )
    db.commit()
    db.refresh(user)
    token_data = create_access_token(
        subject=str(user.id),
        role=user.role.value,
        token_version=int(user.token_version),
    )
    return _token_response(user, token_data)


def _phone_link_is_provable(owner: User) -> bool:
    """A palavra-passe da conta activa prova a posse. Contas demo privilegiadas não."""
    if owner.status != UserStatus.active:
        return False
    if owner.is_test_account and owner.role in _PRIVILEGED_TEST_LOGIN_ROLES:
        return False
    if not owner.password_hash:
        return False
    return True


def _raise_existing_account_link_required(*, id_token: str | None = None) -> None:
    """Pede a palavra-passe. Não descreve o papel nem o email da conta."""
    detail: dict[str, str] = {
        "code": "existing_account_link_required",
        "proof": "password",
    }
    # O redirect web consome o authorization code. O id_token volta só para
    # esta página o reenviar em memória. O login nativo já o tem.
    if id_token:
        detail["id_token"] = id_token
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=detail,
    )


def _refuse_unproven_phone_owner(owner: User) -> None:
    """Telefone já usado. Não grava nada e não descreve a conta existente."""
    demo_privileged = owner.is_test_account and owner.role in _PRIVILEGED_TEST_LOGIN_ROLES
    if owner.status == UserStatus.active and not owner.password_hash and not demo_privileged:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "password_required"},
        )
    if _phone_link_is_provable(owner):
        _raise_existing_account_link_required()
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail={"code": "existing_account_link_conflict"},
    )


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
    identity = lookup_identity_by_google_subject(db, sub)
    if identity is not None and identity.revoked_at is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="identity_revoked",
        )
    if identity is None:
        return _create_google_passenger(
            db,
            sub=sub,
            email=email,
            name=cleaned_name,
            phone=normalized_phone,
        )

    user = db.get(User, identity.user_id)
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
    if user.status == UserStatus.blocked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="blocked",
        )
    if not _is_google_passenger_onboarding(db, user):
        if user.status == UserStatus.pending:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="pending_approval",
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="google_onboarding_not_pending",
        )

    owner = db.execute(
        select(User).where(User.phone == normalized_phone, User.id != user.id)
    ).scalar_one_or_none()
    if owner is not None:
        _refuse_unproven_phone_owner(owner)
    if active_beta_user_count(db) >= settings.MAX_BETA_USERS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="BETA cheio",
        )
    try:
        sync_known_google_email(db, user, identity, email)
    except IdentityEmailTaken:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="google_email_mismatch",
        ) from None

    user.name = cleaned_name
    user.phone = normalized_phone
    user.status = UserStatus.active
    user.requested_role = None
    record_acceptance(db, user.id, LegalAcceptanceSource.register_google)
    record_identity_event(
        db,
        event_type="identity_login",
        user_id=user.id,
        identity_id=identity.id,
        provider="google",
        result="onboarded",
    )
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


def _create_google_passenger(
    db: Session,
    *,
    sub: str,
    email: str,
    name: str,
    phone: str,
) -> TokenResponse:
    """Cria o User só no fim do onboarding, com telefone real e identity primária."""
    owner = db.execute(select(User).where(User.phone == phone)).scalar_one_or_none()
    if owner is not None:
        _refuse_unproven_phone_owner(owner)
    if lookup_identity_by_email(db, email) is not None or db.execute(
        select(User.id).where(func.lower(User.email) == email)
    ).scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "identity_email_taken"},
        )
    if lookup_identity_by_google_subject(db, sub) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "identity_subject_taken"},
        )
    if active_beta_user_count(db) >= settings.MAX_BETA_USERS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="BETA cheio",
        )
    user = User(
        role=Role.passenger,
        name=name,
        phone=phone,
        email=email,
        status=UserStatus.active,
        requested_role=None,
    )
    db.add(user)
    db.flush()
    try:
        identity = attach_google_identity(db, user, email=email, subject=sub)
    except IdentityEmailTaken:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "identity_email_taken"},
        ) from None
    except IdentitySubjectTaken:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "identity_subject_taken"},
        ) from None
    except IdentityLimitReached:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "identity_limit_reached"},
        ) from None
    record_acceptance(db, user.id, LegalAcceptanceSource.register_google)
    record_identity_event(
        db,
        event_type="identity_added",
        user_id=user.id,
        identity_id=identity.id,
        provider="google",
        result="created",
    )
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
    """`GOOGLE_OAUTH_*`: troca `code` por JWT. O papel vem da conta, não do ecrã."""
    check_google_exchange_rate_limit(request)
    if not _google_oauth_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="google_oauth_disabled",
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


def _validated_google_claims(id_token: str, nonce: str | None) -> dict:
    try:
        claims = verify_id_token_claims(id_token.strip())
        raw_nonce = (nonce or "").strip()
        claim_nonce = str(claims.get("nonce") or "")
        if raw_nonce or claim_nonce:
            assert_id_token_nonce(claims, raw_nonce)
    except RuntimeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="google_token_invalid",
        ) from None
    return claims


def _reject_google_link(
    db: Session,
    *,
    user_id: uuid.UUID | None,
    result: str,
    status_code: int,
    detail: str | dict[str, str],
) -> None:
    db.rollback()
    record_identity_event(
        db,
        event_type="identity_link_failed",
        user_id=user_id,
        identity_id=None,
        provider="google",
        result=result,
    )
    db.commit()
    raise HTTPException(status_code=status_code, detail=detail)


def _link_google_to_phone_owner(
    db: Session,
    claims: dict,
    *,
    phone: str,
    password: str,
    accept_legal: bool,
) -> TokenResponse:
    """Liga o Google à conta do telefone. Não cria nem apaga Users."""
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
    normalized_phone = _normalize_onboarding_phone(phone)
    known = lookup_identity_by_google_subject(db, sub)
    if known is not None and known.revoked_at is not None:
        _reject_google_link(
            db,
            user_id=known.user_id,
            result="identity_revoked",
            status_code=status.HTTP_403_FORBIDDEN,
            detail="identity_revoked",
        )
    owner = db.execute(
        select(User).where(User.phone == normalized_phone)
    ).scalar_one_or_none()
    if owner is None or owner.status != UserStatus.active:
        _reject_google_link(
            db,
            user_id=owner.id if owner is not None else None,
            result="existing_account_link_conflict",
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "existing_account_link_conflict"},
        )
    if owner.password_hash is None:
        _reject_google_link(
            db,
            user_id=owner.id,
            result="password_required",
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "password_required"},
        )
    if not _phone_link_is_provable(owner):
        _reject_google_link(
            db,
            user_id=owner.id,
            result="existing_account_link_conflict",
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "existing_account_link_conflict"},
        )
    if not verify_password(password, owner.password_hash or ""):
        _reject_google_link(
            db,
            user_id=owner.id,
            result="invalid_credentials",
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_credentials",
        )
    role_before = owner.role
    phone_before = owner.phone
    try:
        identity = attach_google_identity(db, owner, email=email, subject=sub)
    except IdentityEmailTaken:
        _reject_google_link(
            db,
            user_id=owner.id,
            result="identity_email_taken",
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "identity_email_taken"},
        )
    except IdentitySubjectTaken:
        _reject_google_link(
            db,
            user_id=owner.id,
            result="identity_subject_taken",
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "identity_subject_taken"},
        )
    except IdentityLimitReached:
        _reject_google_link(
            db,
            user_id=owner.id,
            result="identity_limit_reached",
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "identity_limit_reached"},
        )
    owner.role = role_before
    owner.phone = phone_before
    record_identity_event(
        db,
        event_type="identity_added",
        user_id=owner.id,
        identity_id=identity.id,
        provider="google",
        result="linked",
    )
    try:
        if acceptance_required(db, owner.id):
            record_acceptance(db, owner.id, LegalAcceptanceSource.register_google)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "existing_account_link_conflict"},
        ) from None
    db.refresh(owner)
    token_data = create_access_token(
        subject=str(owner.id),
        role=owner.role.value,
        token_version=int(owner.token_version),
    )
    return _token_response(owner, token_data)


@router.post("/google/link", response_model=TokenResponse)
async def google_link_existing_account(
    payload: GoogleLinkRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Confirma a conta do telefone com palavra-passe e liga o Google a ela."""
    check_google_exchange_rate_limit(request)
    if not _google_oauth_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="google_oauth_disabled",
        )
    normalized_phone = _normalize_onboarding_phone(payload.phone)
    check_beta_login_rate_limit(request, normalized_phone)
    claims = await anyio.to_thread.run_sync(
        _validated_google_claims, payload.id_token.strip(), payload.nonce
    )
    return _link_google_to_phone_owner(
        db,
        claims,
        phone=normalized_phone,
        password=payload.password,
        accept_legal=payload.accept_legal,
    )


@router.post("/reauth", response_model=ReauthResponse)
def reauth_with_password(
    payload: ReauthRequest,
    request: Request,
    user_ctx: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReauthResponse:
    """Prova curta da sessão actual. Não é um access token."""
    header = request.headers.get("authorization") or ""
    access_token = header.split(" ", 1)[1].strip() if header.lower().startswith("bearer ") else ""
    try:
        access_claims = decode_access_token(access_token)
        access_iat = int(access_claims["iat"])
    except (jwt.InvalidTokenError, TypeError, ValueError, KeyError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_token",
        ) from None
    try:
        user_id = uuid.UUID(user_ctx.user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_user_id"
        ) from None
    account = db.get(User, user_id)
    password_ok = (
        account is not None
        and account.password_hash is not None
        and verify_password(payload.password, account.password_hash)
    )
    if account is None or not password_ok:
        record_identity_event(
            db,
            event_type="strong_reauth_failed",
            user_id=account.id if account is not None else None,
            identity_id=None,
            provider="reauth",
            result="invalid_credentials",
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_credentials",
        )
    proof = create_strong_auth_proof(
        user_id=str(account.id),
        token_version=int(account.token_version),
        access_iat=access_iat,
    )
    record_identity_event(
        db,
        event_type="strong_reauth_success",
        user_id=account.id,
        identity_id=None,
        provider="reauth",
        result="ok",
    )
    db.commit()
    return ReauthResponse(reauth_token=proof["token"], expires_at=proof["expires_at"])


_MANAGE_HTTP = {
    "identity_not_found": status.HTTP_404_NOT_FOUND,
    "already_primary": status.HTTP_409_CONFLICT,
    "identity_not_verified": status.HTTP_409_CONFLICT,
    "identity_email_taken": status.HTTP_409_CONFLICT,
    "identity_subject_taken": status.HTTP_409_CONFLICT,
    "identity_limit_reached": status.HTTP_409_CONFLICT,
    "last_active_identity": status.HTTP_409_CONFLICT,
    "primary_identity": status.HTTP_409_CONFLICT,
}


def _bearer_token(request: Request) -> str:
    header = request.headers.get("authorization") or ""
    if not header.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token"
        )
    token = header.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token"
        )
    return token


def _account_for_session(db: Session, user_ctx: UserContext) -> User:
    try:
        user_id = uuid.UUID(user_ctx.user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_user_id"
        ) from None
    account = db.get(User, user_id)
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="user_not_found"
        )
    return account


def _require_identity_step_up(
    request: Request,
    user: User,
    *,
    password: str | None,
    reauth_token: str | None,
) -> None:
    """Staff confirmam a password no pedido. Os outros podem usar a prova curta.

    403, não 401: o access token continua válido. O cliente trata 401 como fim de sessão.
    """
    staff = user.role in (Role.admin, Role.super_admin)
    supplied = (password or "").strip()
    proof = (reauth_token or "").strip()
    if staff:
        if not supplied:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="password_required"
            )
        if user.password_hash is None or not verify_password(
            supplied, user.password_hash
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="invalid_credentials"
            )
        return
    if proof:
        try:
            access_claims = decode_access_token(_bearer_token(request))
            access_iat = int(access_claims["iat"])
        except (jwt.InvalidTokenError, TypeError, ValueError, KeyError):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token"
            ) from None
        if verify_strong_auth_proof(
            proof,
            user_id=str(user.id),
            token_version=int(user.token_version),
            access_iat=access_iat,
        ):
            return
        if not supplied:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="strong_auth_required"
            )
    if user.password_hash is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="password_required"
        )
    if supplied and verify_password(supplied, user.password_hash):
        return
    if supplied:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="invalid_credentials"
        )
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN, detail="strong_auth_required"
    )


def _identity_list_response(db: Session, user_id: uuid.UUID) -> IdentityListResponse:
    rows = list_login_identities(db, user_id)
    return IdentityListResponse(
        identities=[
            IdentityItemResponse(
                id=row.id,
                provider=row.provider,
                email=row.email,
                is_primary=row.is_primary,
                is_verified=row.is_verified,
                created_at=row.created_at,
            )
            for row in rows
        ],
        active_count=len(rows),
        limit=ACTIVE_IDENTITY_LIMIT,
    )


def _manage_http(exc: IdentityManageError) -> HTTPException:
    return HTTPException(
        status_code=_MANAGE_HTTP.get(exc.code, status.HTTP_409_CONFLICT),
        detail=exc.code,
    )


async def _claims_for_added_google(payload: AddGoogleIdentityRequest) -> dict:
    has_token = bool((payload.id_token or "").strip())
    has_code = bool((payload.code or "").strip())
    if has_token == has_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="google_token_invalid"
        )
    if has_code:
        if not (payload.redirect_uri or "").strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="google_token_invalid"
            )
        try:
            redirect_uri = assert_allowed_google_redirect(payload.redirect_uri or "")
            tok_pack = await exchange_code_for_id_token(
                code=(payload.code or "").strip(),
                redirect_uri=redirect_uri,
            )
            return await anyio.to_thread.run_sync(
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
    return _validated_google_claims((payload.id_token or "").strip(), payload.nonce)


@router.get("/identities", response_model=IdentityListResponse)
def list_my_identities(
    user_ctx: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> IdentityListResponse:
    """Identities activas do próprio User. Sem strong-auth."""
    account = _account_for_session(db, user_ctx)
    return _identity_list_response(db, account.id)


@router.post(
    "/identities/{identity_id}/make-primary",
    response_model=IdentityMutationResponse,
)
def make_my_identity_primary(
    identity_id: uuid.UUID,
    payload: IdentityStepUpRequest,
    request: Request,
    user_ctx: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> IdentityMutationResponse:
    """Troca a primary e espelha users.email. Não mexe em token_version."""
    account = _account_for_session(db, user_ctx)
    _require_identity_step_up(
        request,
        account,
        password=payload.password,
        reauth_token=payload.reauth_token,
    )
    try:
        _identity, previous_id = make_identity_primary(db, account.id, identity_id)
        record_identity_event(
            db,
            event_type="identity_primary_changed",
            user_id=account.id,
            identity_id=_identity.id,
            provider=_identity.provider,
            result="ok",
            from_identity_id=previous_id,
        )
        body = _identity_list_response(db, account.id)
        db.commit()
    except IdentityManageError as exc:
        db.rollback()
        raise _manage_http(exc) from exc
    except Exception:
        db.rollback()
        raise
    return IdentityMutationResponse(
        identities=body.identities,
        active_count=body.active_count,
        limit=body.limit,
        result="ok",
    )


@router.post(
    "/identities/{identity_id}/revoke",
    response_model=IdentityMutationResponse,
)
def revoke_my_identity(
    identity_id: uuid.UUID,
    payload: IdentityStepUpRequest,
    request: Request,
    user_ctx: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> IdentityMutationResponse:
    """Revoga uma identity não-primária. A linha, o email e o subject ficam."""
    account = _account_for_session(db, user_ctx)
    _require_identity_step_up(
        request,
        account,
        password=payload.password,
        reauth_token=payload.reauth_token,
    )
    try:
        revoked = revoke_login_identity(db, account.id, identity_id)
        record_identity_event(
            db,
            event_type="identity_revoked",
            user_id=account.id,
            identity_id=revoked.id,
            provider=revoked.provider,
            result="ok",
        )
        body = _identity_list_response(db, account.id)
        db.commit()
    except IdentityManageError as exc:
        db.rollback()
        raise _manage_http(exc) from exc
    except Exception:
        db.rollback()
        raise
    return IdentityMutationResponse(
        identities=body.identities,
        active_count=body.active_count,
        limit=body.limit,
        result="ok",
    )


@router.post("/identities/google", response_model=IdentityMutationResponse)
async def add_my_google_identity(
    payload: AddGoogleIdentityRequest,
    request: Request,
    user_ctx: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> IdentityMutationResponse:
    """Acrescenta Google à sessão actual. Não cria User nem muda a sessão."""
    check_google_exchange_rate_limit(request)
    if not _google_oauth_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="google_oauth_disabled",
        )
    account = _account_for_session(db, user_ctx)
    _require_identity_step_up(
        request,
        account,
        password=payload.password,
        reauth_token=payload.reauth_token,
    )
    role_before = account.role
    phone_before = account.phone
    version_before = int(account.token_version)
    legacy_before = account.oauth_google_sub
    claims = await _claims_for_added_google(payload)
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
    try:
        identity, result = add_google_login_identity(
            db, account, email=email, subject=sub
        )
        account.role = role_before
        account.phone = phone_before
        account.token_version = version_before
        account.oauth_google_sub = legacy_before
        record_identity_event(
            db,
            event_type="identity_google_added",
            user_id=account.id,
            identity_id=identity.id,
            provider="google",
            result=result,
        )
        body = _identity_list_response(db, account.id)
        db.commit()
    except IdentityManageError as exc:
        db.rollback()
        raise _manage_http(exc) from exc
    except Exception:
        db.rollback()
        raise
    return IdentityMutationResponse(
        identities=body.identities,
        active_count=body.active_count,
        limit=body.limit,
        result=result,
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
