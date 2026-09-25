"""Current legal acceptance is the latest row matching configured versions."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.user_legal_acceptance import LegalAcceptanceSource, UserLegalAcceptance

REGISTER_SOURCES = {
    LegalAcceptanceSource.register_otp,
    LegalAcceptanceSource.register_google,
}
LOGIN_REACCEPT = LegalAcceptanceSource.login_reaccept


def _versions_match(row: UserLegalAcceptance) -> bool:
    return (
        row.terms_version == settings.CURRENT_TERMS_VERSION
        and row.privacy_version == settings.CURRENT_PRIVACY_VERSION
    )


def latest_acceptance(db: Session, user_id: uuid.UUID) -> UserLegalAcceptance | None:
    return db.execute(
        select(UserLegalAcceptance)
        .where(UserLegalAcceptance.user_id == user_id)
        .order_by(UserLegalAcceptance.accepted_at.desc(), UserLegalAcceptance.id.desc())
        .limit(1)
    ).scalar_one_or_none()


def acceptance_required(db: Session, user_id: uuid.UUID) -> bool:
    latest = latest_acceptance(db, user_id)
    return latest is None or not _versions_match(latest)


def status_payload(db: Session, user_id: uuid.UUID) -> dict[str, str | bool]:
    return {
        "required": acceptance_required(db, user_id),
        "terms_version": settings.CURRENT_TERMS_VERSION,
        "privacy_version": settings.CURRENT_PRIVACY_VERSION,
        "terms_url": settings.LEGAL_TERMS_URL,
        "privacy_url": settings.LEGAL_PRIVACY_URL,
    }


def record_acceptance(
    db: Session,
    user_id: uuid.UUID,
    source: LegalAcceptanceSource,
) -> UserLegalAcceptance:
    row = UserLegalAcceptance(
        user_id=user_id,
        terms_version=settings.CURRENT_TERMS_VERSION,
        privacy_version=settings.CURRENT_PRIVACY_VERSION,
        accepted_at=datetime.now(timezone.utc),
        source=source.value,
    )
    db.add(row)
    return row
