import uuid

from fastapi import APIRouter, Depends, status
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
