import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import DateTime, Enum, Index, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import Role, UserStatus


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique user identifier.",
    )
    role: Mapped[Role] = mapped_column(
        Enum(Role, name="role_enum"),
        nullable=False,
        comment="Active role for permissions.",
    )
    name: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
        comment="Display name.",
    )
    phone: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        unique=True,
        index=True,
        comment="Phone number used for OTP login.",
    )
    status: Mapped[UserStatus] = mapped_column(
        Enum(UserStatus, name="user_status_enum"),
        nullable=False,
        comment="Account status.",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Creation timestamp.",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
        comment="Updated on state changes or profile edits.",
    )

    driver_profile: Mapped[Optional["Driver"]] = relationship(
        back_populates="user",
        uselist=False,
    )
    passenger_trips: Mapped[List["Trip"]] = relationship(
        back_populates="passenger",
        foreign_keys="Trip.passenger_id",
    )


Index("ix_users_role_status", User.role, User.status)

