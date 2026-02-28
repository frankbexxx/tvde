from fastapi import APIRouter, WebSocket, status
from sqlalchemy import select

from app.auth.security import decode_access_token
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal
from app.models.enums import UserStatus
from app.realtime.hub import hub


router = APIRouter(tags=["ws"])


def _extract_token(websocket: WebSocket) -> str | None:
    auth = websocket.headers.get("Authorization")
    if auth and auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()
    return websocket.query_params.get("token")


async def _authorize(websocket: WebSocket, trip_id: str) -> bool:
    token = _extract_token(websocket)
    if not token:
        return False
    try:
        payload = decode_access_token(token)
    except Exception:
        return False

    user_id = payload.get("sub")
    if not user_id:
        return False

    with SessionLocal() as db:
        user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
        if not user or user.status != UserStatus.active:
            return False

        trip = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one_or_none()
        if not trip:
            return False

        return str(trip.passenger_id) == str(user.id) or str(trip.driver_id) == str(user.id)


@router.websocket("/ws/trips/{trip_id}")
async def trip_status_ws(websocket: WebSocket, trip_id: str) -> None:
    await websocket.accept()
    if not await _authorize(websocket, trip_id):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await hub.subscribe(trip_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except Exception:
        pass
    finally:
        await hub.unsubscribe(trip_id, websocket)
        await websocket.close()

