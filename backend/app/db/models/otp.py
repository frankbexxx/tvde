import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Index, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class OtpCode(Base):
    __tablename__ = "otp_codes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique OTP request identifier.",
    )
    phone: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        index=True,
        comment="Phone number used for OTP.",
    )
    code_hash: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        comment="Hashed OTP code.",
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        comment="OTP expiration timestamp.",
    )
    consumed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when OTP was used.",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Creation timestamp.",
    )


Index("ix_otp_codes_phone_expires", OtpCode.phone, OtpCode.expires_at)
