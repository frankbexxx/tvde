"""Idle WebSocket receive loop until disconnect (Starlette-safe)."""

from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect


async def receive_until_disconnect(websocket: WebSocket) -> None:
    """
    Block on receive_text() until the client disconnects.

    Starlette may raise WebSocketDisconnect or, in some versions / races,
    RuntimeError (e.g. receive after a disconnect frame). The latter is not
    yet always normalised to WebSocketDisconnect; see Starlette discussions.
    """
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    except RuntimeError as exc:
        msg = str(exc).lower()
        if "disconnect" in msg or (
            "receive" in msg and ("cannot" in msg or "already" in msg)
        ):
            pass
        else:
            raise
