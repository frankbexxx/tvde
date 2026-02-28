from fastapi import APIRouter, WebSocket, status


router = APIRouter(tags=["realtime"])


@router.websocket("/trips/{trip_id}")
async def passenger_trip_ws(websocket: WebSocket, trip_id: str) -> None:
    await websocket.accept()
    await websocket.close(
        code=status.WS_1008_POLICY_VIOLATION,
        reason="Not implemented",
    )


@router.websocket("/driver/trips/{trip_id}")
async def driver_trip_ws(websocket: WebSocket, trip_id: str) -> None:
    await websocket.accept()
    await websocket.close(
        code=status.WS_1008_POLICY_VIOLATION,
        reason="Not implemented",
    )

