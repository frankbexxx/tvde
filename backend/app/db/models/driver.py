import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, Numeric, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import DriverStatus


class Driver(Base):
    __tablename__ = "drivers"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
        comment="User identifier for the driver profile.",
    )
    status: Mapped[DriverStatus] = mapped_column(
        Enum(DriverStatus, name="driver_status_enum"),
        nullable=False,
        comment="Driver approval status.",
    )
    documents: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Document references or URLs.",
    )
    commission_percent: Mapped[float] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        comment="Commission percentage for this driver.",
    )
    is_available: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
        comment="True when driver can accept new trips.",
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
        comment="Updated on approval or contract changes.",
    )

    user: Mapped["User"] = relationship(back_populates="driver_profile")
    trips: Mapped[List["Trip"]] = relationship(back_populates="driver")


Index("ix_drivers_status", Driver.status)

