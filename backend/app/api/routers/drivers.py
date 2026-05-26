import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.api.deps import UserContext, get_db, require_role
from app.models.enums import Role
from app.schemas.driver import (
    DriverLocationPayload,
    DriverLocationResponse,
    DriverVehicleCategoriesPayload,
    DriverVehicleCategoriesResponse,
)
from app.schemas.driver_documents import (
    DriverDocumentsPatchRequest,
    DriverDocumentsStateResponse,
    DriverDocumentsSuggestExpiryRequest,
    DriverDocumentsSuggestExpiryResponse,
)
from app.schemas.partner_messages import DriverMessageCreateRequest, DriverMessageListItem
from app.db.models.driver import DriverLocation
from app.db.models.driver import Driver
from app.services.driver_location import upsert_driver_location
from app.services.driver_preferences import (
    decode_driver_categories_csv,
    encode_driver_categories_csv,
)
from app.services.driver_documents import (
    apply_driver_documents_patch,
    get_documents_for_driver,
)
from app.services.driver_document_expiry_suggest import suggest_expiry_iso_from_text
from app.services.driver_document_upload import (
    resolve_driver_document_path,
    save_driver_document_file,
)
from app.services.partner_messages import (
    create_driver_message_to_partner,
    list_driver_messages,
    list_driver_sent_messages,
    mark_driver_message_read,
    _utc_iso as message_utc_iso,
)


router = APIRouter(prefix="/drivers", tags=["driver"])
# Alias singular (spec / clients): same behaviour as POST /drivers/location
driver_router = APIRouter(prefix="/driver", tags=["driver"])


def _persist_driver_location(
    *,
    db: Session,
    user: UserContext,
    payload: DriverLocationPayload,
) -> None:
    upsert_driver_location(
        db=db,
        driver_id=user.user_id,
        lat=payload.lat,
        lng=payload.lng,
        timestamp_ms=payload.timestamp,
    )


@router.post(
    "/location",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Update current driver location",
)
async def update_location(
    payload: DriverLocationPayload,
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> None:
    """
    Receive the driver's current GPS location.

    Frontend: called every few seconds when driver is online.
    """
    _persist_driver_location(db=db, user=user, payload=payload)


@router.get(
    "/location/last",
    response_model=DriverLocationResponse,
    summary="Get last stored driver location (server-side)",
)
async def get_last_location(
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> DriverLocationResponse:
    """Returns what the server has stored (useful to debug 'GPS upload ok' vs DB)."""
    driver_uuid = uuid.UUID(str(user.user_id))
    loc = db.execute(
        select(DriverLocation).where(DriverLocation.driver_id == driver_uuid).limit(1)
    ).scalar_one_or_none()
    if loc is None:
        # Keep consistent with start_trip expectation
        from fastapi import HTTPException

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="driver_location_not_found"
        )
    ts = loc.timestamp
    if ts.tzinfo is None:
        from datetime import timezone

        ts = ts.replace(tzinfo=timezone.utc)
    return DriverLocationResponse(
        lat=float(loc.lat),
        lng=float(loc.lng),
        timestamp=int(ts.timestamp() * 1000),
    )


@driver_router.post(
    "/location",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Update current driver location (alias)",
)
async def update_location_alias(
    payload: DriverLocationPayload,
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> None:
    """Same as POST /drivers/location."""
    _persist_driver_location(db=db, user=user, payload=payload)


@driver_router.get(
    "/preferences/vehicle-categories",
    response_model=DriverVehicleCategoriesResponse,
    summary="Get driver vehicle categories",
)
async def get_vehicle_categories(
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> DriverVehicleCategoriesResponse:
    driver = db.execute(select(Driver).where(Driver.user_id == user.user_id)).scalar_one_or_none()
    if driver is None:
        from fastapi import HTTPException

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="driver_not_found")
    return DriverVehicleCategoriesResponse(
        categories=decode_driver_categories_csv(driver.vehicle_categories)
    )


@driver_router.patch(
    "/preferences/vehicle-categories",
    response_model=DriverVehicleCategoriesResponse,
    summary="Update driver vehicle categories",
)
async def patch_vehicle_categories(
    payload: DriverVehicleCategoriesPayload,
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> DriverVehicleCategoriesResponse:
    driver = db.execute(select(Driver).where(Driver.user_id == user.user_id)).scalar_one_or_none()
    if driver is None:
        from fastapi import HTTPException

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="driver_not_found")
    driver.vehicle_categories = encode_driver_categories_csv(payload.categories)
    db.commit()
    db.refresh(driver)
    return DriverVehicleCategoriesResponse(
        categories=decode_driver_categories_csv(driver.vehicle_categories)
    )


@driver_router.get(
    "/documents",
    response_model=DriverDocumentsStateResponse,
    summary="Driver document vault (JSON)",
)
async def get_my_documents(
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> DriverDocumentsStateResponse:
    uid = uuid.UUID(str(user.user_id))
    data = get_documents_for_driver(db, uid)
    return DriverDocumentsStateResponse(version=int(data["version"]), docs=data["docs"])


@driver_router.patch(
    "/documents",
    response_model=DriverDocumentsStateResponse,
    summary="Submit documents for partner review (no self-approval)",
)
async def patch_my_documents(
    payload: DriverDocumentsPatchRequest,
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> DriverDocumentsStateResponse:
    uid = uuid.UUID(str(user.user_id))
    state = apply_driver_documents_patch(db, user_id=uid, patch=payload.docs)
    return DriverDocumentsStateResponse(version=int(state["version"]), docs=state["docs"])


@driver_router.post(
    "/documents/suggest-expiry",
    response_model=DriverDocumentsSuggestExpiryResponse,
    summary="Suggest expiry date (ISO) from pasted PT document text",
)
async def suggest_document_expiry(
    payload: DriverDocumentsSuggestExpiryRequest,
    user: UserContext = Depends(require_role(Role.driver)),
) -> DriverDocumentsSuggestExpiryResponse:
    _ = user
    return DriverDocumentsSuggestExpiryResponse(
        suggested_expires_at=suggest_expiry_iso_from_text(payload.text)
    )


@driver_router.get("/messages", response_model=list[DriverMessageListItem])
async def list_my_messages(
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> list[DriverMessageListItem]:
    uid = uuid.UUID(str(user.user_id))
    rows = list_driver_messages(db, driver_user_id=uid)
    return [
        DriverMessageListItem(
            id=str(m.id),
            title=m.title,
            body=m.body,
            priority=m.priority,
            created_at=message_utc_iso(m.created_at),
            read=read,
        )
        for m, read in rows
    ]


@driver_router.patch("/messages/{message_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_message_read(
    message_id: str,
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> None:
    uid = uuid.UUID(str(user.user_id))
    try:
        mid = uuid.UUID(message_id.strip())
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_uuid") from None
    mark_driver_message_read(db, driver_user_id=uid, message_id=mid)


@driver_router.get("/messages/sent", response_model=list[DriverMessageListItem])
async def list_my_sent_messages(
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> list[DriverMessageListItem]:
    uid = uuid.UUID(str(user.user_id))
    rows = list_driver_sent_messages(db, driver_user_id=uid)
    return [
        DriverMessageListItem(
            id=str(m.id),
            title=m.title,
            body=m.body,
            priority=m.priority,
            created_at=message_utc_iso(m.created_at),
            read=True,
        )
        for m in rows
    ]


@driver_router.post("/messages", response_model=DriverMessageListItem, status_code=status.HTTP_201_CREATED)
async def create_message_to_partner(
    body: DriverMessageCreateRequest,
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> DriverMessageListItem:
    uid = uuid.UUID(str(user.user_id))
    msg = create_driver_message_to_partner(
        db,
        driver_user_id=uid,
        title=body.title,
        body=body.body,
        priority=body.priority,
    )
    return DriverMessageListItem(
        id=str(msg.id),
        title=msg.title,
        body=msg.body,
        priority=msg.priority,
        created_at=message_utc_iso(msg.created_at),
        read=True,
    )


@driver_router.post(
    "/documents/{doc_key}/upload",
    response_model=DriverDocumentsStateResponse,
    summary="Upload document file (local storage MVP)",
)
async def upload_my_document(
    doc_key: str,
    file: UploadFile = File(...),
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> DriverDocumentsStateResponse:
    uid = uuid.UUID(str(user.user_id))
    state = save_driver_document_file(db, driver_user_id=uid, doc_key=doc_key, upload=file)
    return DriverDocumentsStateResponse(version=int(state["version"]), docs=state["docs"])


@driver_router.get("/documents/{doc_key}/file")
async def download_my_document(
    doc_key: str,
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> FileResponse:
    uid = uuid.UUID(str(user.user_id))
    path = resolve_driver_document_path(db, driver_user_id=uid, doc_key=doc_key)
    return FileResponse(path, filename=path.name)
