from fastapi import APIRouter, WebSocket, status
from sqlalchemy import select

from jwt.exceptions import InvalidTokenError

from app.auth.security import decode_access_token
from app.db.models.user import User
from app.db.session import SessionLocal
from app.models.enums import Role, UserStatus
from app.realtime.admin_hub import admin_hub


router = APIRouter(tags=["ws-admin"])


def _extract_token(websocket: WebSocket) -> str | None:
    auth = websocket.headers.get("Authorization")
    if auth and auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()
    return websocket.query_params.get("token")


async def _authorize_admin(websocket: WebSocket) -> bool:
    token = _extract_token(websocket)
    if not token:
        return False
    try:
        payload = decode_access_token(token)
    except InvalidTokenError:
        return False

    user_id = payload.get("sub")
    if not user_id:
        return False

    with SessionLocal() as db:
        user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
        if not user or user.status != UserStatus.active:
            return False
        return user.role == Role.admin


@router.websocket("/ws/admin/trips")
async def admin_trips_ws(websocket: WebSocket) -> None:
    await websocket.accept()
    if not await _authorize_admin(websocket):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await admin_hub.subscribe(websocket)
    try:
        while True:
            await websocket.receive_text()
    except Exception:
        pass
    finally:
        await admin_hub.unsubscribe(websocket)
        await websocket.close()

