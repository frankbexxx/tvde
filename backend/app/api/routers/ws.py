from fastapi import APIRouter, WebSocket, status
from sqlalchemy import select

from app.auth.security import decode_access_token
from app.db.models.trip import Trip
from app.db.models.user import User
from app.db.session import SessionLocal
from app.models.enums import Role, UserStatus
from app.realtime.driver_offers_hub import driver_offers_hub
from app.realtime.hub import hub
from app.utils.ws_idle_receive import receive_until_disconnect


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
    # Mesmo padrão que driver_offers_ws: accept antes de close (Starlette/Cursor-safe)
    await websocket.accept()
    if not await _authorize(websocket, trip_id):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await hub.subscribe(trip_id, websocket)
    try:
        await receive_until_disconnect(websocket)
    finally:
        await hub.unsubscribe(trip_id, websocket)
        await websocket.close()


async def _authorize_driver(websocket: WebSocket) -> str | None:
    """Validate driver token, return driver_id or None."""
    token = _extract_token(websocket)
    if not token:
        return None
    try:
        payload = decode_access_token(token)
    except Exception:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    with SessionLocal() as db:
        user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
        if not user or user.status != UserStatus.active:
            return None
        if user.role != Role.driver:
            return None
    return user_id


@router.websocket("/ws/driver/offers")
async def driver_offers_ws(websocket: WebSocket) -> None:
    """Driver subscribes to receive new_trip_offer events in real time."""
    await websocket.accept()
    driver_id = await _authorize_driver(websocket)
    if not driver_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await driver_offers_hub.subscribe(driver_id, websocket)
    try:
        await receive_until_disconnect(websocket)
    finally:
        await driver_offers_hub.unsubscribe(driver_id, websocket)
        await websocket.close()

