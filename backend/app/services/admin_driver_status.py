"""Admin driver status approve/reject (E5 / S-ADM-01)."""

from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.driver import Driver
from app.models.enums import DriverStatus
from app.services.admin_audit import record_admin_action

# Transições permitidas (E5.1-A). Destino == actual → idempotente (sem audit).
_APPROVE_FROM = frozenset(
    {DriverStatus.pending, DriverStatus.rejected, DriverStatus.approved}
)
_REJECT_FROM = frozenset(
    {DriverStatus.pending, DriverStatus.approved, DriverStatus.rejected}
)


def _parse_driver_user_id(driver_id: str) -> uuid.UUID:
    try:
        return uuid.UUID(driver_id.strip())
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_driver_id",
        ) from exc


def _load_driver_for_update(db: Session, driver_user_id: uuid.UUID) -> Driver:
    driver = db.execute(
        select(Driver)
        .where(Driver.user_id == driver_user_id)
        .with_for_update(of=Driver)
    ).scalar_one_or_none()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="driver_not_found",
        )
    return driver


def set_driver_status_admin(
    db: Session,
    *,
    driver_id: str,
    target: DriverStatus,
    actor_user_id: str,
) -> Driver:
    """
    Aprova ou rejeita perfil Driver (user_id).

    - Idempotente se já no estado alvo (200, sem audit).
    - Transição fora do conjunto E5.1 → 409.
    """
    if target not in (DriverStatus.approved, DriverStatus.rejected):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid_target_status",
        )

    driver_uuid = _parse_driver_user_id(driver_id)
    driver = _load_driver_for_update(db, driver_uuid)
    current = driver.status

    allowed_from = _APPROVE_FROM if target == DriverStatus.approved else _REJECT_FROM
    if current not in allowed_from:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="invalid_driver_status_transition",
        )

    if current == target:
        return driver

    before = current.value
    driver.status = target
    if target == DriverStatus.rejected:
        # Higiene: rejeitado não deve ficar elegível visualmente como disponível.
        # Matching já filtra por approved; Partner flows não são alterados.
        driver.is_available = False

    record_admin_action(
        db,
        actor_user_id=actor_user_id,
        action="driver_approve" if target == DriverStatus.approved else "driver_reject",
        entity_type="driver",
        entity_id=str(driver.user_id),
        payload={"before": before, "after": target.value},
    )
    db.commit()
    db.refresh(driver)
    return driver
