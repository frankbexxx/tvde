"""Trip state machine — valida transições de estado da viagem."""

import logging
from fastapi import HTTPException, status

from app.models.enums import TripStatus


logger = logging.getLogger(__name__)

# Transições permitidas: old_state -> [new_states]
# queued: declarado para B2 next-trip (SPIKE-BE-1); sem writers runtime ainda.
ALLOWED_TRANSITIONS: dict[TripStatus, list[TripStatus]] = {
    TripStatus.requested: [
        TripStatus.assigned,
        TripStatus.cancelled,
        TripStatus.queued,
    ],
    TripStatus.assigned: [TripStatus.accepted, TripStatus.cancelled],
    TripStatus.accepted: [TripStatus.arriving, TripStatus.cancelled],
    TripStatus.arriving: [TripStatus.ongoing, TripStatus.cancelled],
    TripStatus.ongoing: [TripStatus.completed, TripStatus.cancelled, TripStatus.failed],
    TripStatus.queued: [TripStatus.accepted, TripStatus.cancelled],
}


def validate_trip_transition(
    old_state: TripStatus,
    new_state: TripStatus,
    *,
    trip_id: str | None = None,
) -> None:
    """
    Valida se a transição de estado é permitida.
    Levanta HTTPException 409 se a transição for inválida.
    """
    if old_state == new_state:
        return

    allowed = ALLOWED_TRANSITIONS.get(old_state, [])
    if new_state not in allowed:
        logger.warning(
            "invalid_trip_state_transition",
            extra={
                "trip_id": str(trip_id) if trip_id else None,
                "from": old_state.value,
                "to": new_state.value,
            },
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="invalid_trip_state_transition",
        )
