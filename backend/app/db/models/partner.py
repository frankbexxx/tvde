from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.db.models.driver import Driver
    from app.db.models.user import User


class Partner(Base):
    __tablename__ = "partners"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Fleet / organization identifier.",
    )
    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        comment="Display name of the partner organization.",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Creation timestamp.",
    )

    drivers: Mapped[List["Driver"]] = relationship(back_populates="partner")
    users: Mapped[List["User"]] = relationship(
        back_populates="partner_org",
        foreign_keys="User.partner_org_id",
    )
