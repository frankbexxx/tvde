from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
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
    OtpRequest,
    OtpRequestResponse,
    OtpVerifyRequest,
    TokenResponse,
)


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/otp/request", response_model=OtpRequestResponse)
async def request_otp(
    payload: OtpRequest,
    db: Session = Depends(get_db),
) -> OtpRequestResponse:
    code = generate_otp_code()
    if settings.ENV == "dev":
        print(f"[DEV OTP] phone={payload.phone} code={code}")
    expires_at = otp_expiration_time()
    code_hash = hash_otp_code(payload.phone, code)

    otp = OtpCode(
        phone=payload.phone,
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
    otp: Optional[OtpCode] = db.execute(
        select(OtpCode)
        .where(
            OtpCode.phone == payload.phone,
            OtpCode.consumed_at.is_(None),
            OtpCode.expires_at > now,
        )
        .order_by(OtpCode.created_at.desc())
        .limit(1)
    ).scalar_one_or_none()

    if not otp or not verify_otp_code(payload.phone, payload.code, otp.code_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_otp",
        )

    otp.consumed_at = now

    user = db.execute(select(User).where(User.phone == payload.phone)).scalar_one_or_none()
    if not user:
        user = User(
            role=Role.passenger,
            name=payload.phone,
            phone=payload.phone,
            status=UserStatus.active,
        )
        db.add(user)

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
        token_type="bearer",
        user_id=str(user.id),
        role=user.role,
        expires_at=token_data["expires_at"],
    )

