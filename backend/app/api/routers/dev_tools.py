"""
Dev-only router for Web Test Console.
All endpoints return 404 when ENV != "dev".
"""
import random

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, text
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_db
from app.auth.security import create_access_token
from app.core.config import settings
from app.db.models.driver import Driver
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.db.models.user import User
from app.models.enums import DriverStatus, Role, UserStatus
from app.schemas.trip import TripCreateRequest
from app.services.trips import (
    accept_trip as accept_trip_service,
    assign_trip as assign_trip_service,
    complete_trip as complete_trip_service,
    create_trip as create_trip_service,
    mark_trip_arriving as mark_trip_arriving_service,
    start_trip as start_trip_service,
)


def _require_dev() -> None:
    if settings.ENV != "dev" and not settings.ENABLE_DEV_TOOLS:
        raise HTTPException(status_code=404)


router = APIRouter(prefix="/dev", tags=["dev"])


# --- Lisbon bounding box ---
LISBON_LAT_MIN, LISBON_LAT_MAX = 38.70, 38.80
LISBON_LNG_MIN, LISBON_LNG_MAX = -9.20, -9.10


def _random_lisbon_coords() -> tuple[float, float]:
    lat = random.uniform(LISBON_LAT_MIN, LISBON_LAT_MAX)
    lng = random.uniform(LISBON_LNG_MIN, LISBON_LNG_MAX)
    return round(lat, 6), round(lng, 6)


# --- Response schemas (inline for dev) ---


@router.post("/reset")
async def dev_reset(db: Session = Depends(get_db)) -> dict:
    _require_dev()
    db.execute(text("TRUNCATE payments, trips CASCADE"))
    db.commit()
    return {"status": "reset_ok"}


@router.post("/seed")
async def dev_seed(db: Session = Depends(get_db)) -> dict:
    _require_dev()

    def get_or_create_user(phone: str, role: Role) -> User:
        user = db.execute(select(User).where(User.phone == phone)).scalar_one_or_none()
        if not user:
            user = User(
                role=role,
                name=phone,
                phone=phone,
                status=UserStatus.active,
            )
            db.add(user)
            db.flush()
        return user

    passenger = get_or_create_user("+351912345678", Role.passenger)
    admin = get_or_create_user("+351900000000", Role.admin)
    driver_user = get_or_create_user("+351911111111", Role.driver)

    driver_profile = db.execute(
        select(Driver).where(Driver.user_id == driver_user.id)
    ).scalar_one_or_none()
    if not driver_profile:
        driver_profile = Driver(
            user_id=driver_user.id,
            status=DriverStatus.approved,
            commission_percent=15,
        )
        db.add(driver_profile)
    else:
        driver_profile.is_available = True

    db.commit()
    db.refresh(passenger)
    db.refresh(admin)
    db.refresh(driver_user)

    return {
        "passenger_id": str(passenger.id),
        "admin_id": str(admin.id),
        "driver_id": str(driver_user.id),
    }


@router.post("/seed-simulator")
async def dev_seed_simulator(
    db: Session = Depends(get_db),
    passengers: int = Query(20, ge=1, le=100),
    drivers: int = Query(8, ge=1, le=50),
) -> dict:
    """
    Cria N passageiros e M motoristas para o simulador de tráfego.
    Retorna listas de tokens (um por bot).
    """
    _require_dev()

    def get_or_create_user(phone: str, role: Role) -> User:
        user = db.execute(select(User).where(User.phone == phone)).scalar_one_or_none()
        if not user:
            user = User(
                role=role,
                name=phone,
                phone=phone,
                status=UserStatus.active,
            )
            db.add(user)
            db.flush()
        return user

    def make_token(user: User) -> str:
        data = create_access_token(subject=str(user.id), role=user.role.value)
        return data["token"]

    passenger_tokens = []
    for i in range(1, passengers + 1):
        phone = f"+3519123456{i:02d}"
        user = get_or_create_user(phone, Role.passenger)
        db.refresh(user)
        passenger_tokens.append(make_token(user))

    driver_tokens = []
    for i in range(1, drivers + 1):
        phone = f"+3519111111{i:02d}"
        user = get_or_create_user(phone, Role.driver)
        driver_profile = db.execute(
            select(Driver).where(Driver.user_id == user.id)
        ).scalar_one_or_none()
        if not driver_profile:
            driver_profile = Driver(
                user_id=user.id,
                status=DriverStatus.approved,
                commission_percent=15,
            )
            db.add(driver_profile)
        else:
            driver_profile.is_available = True
        db.refresh(user)
        driver_tokens.append(make_token(user))

    db.commit()
    return {"passenger_tokens": passenger_tokens, "driver_tokens": driver_tokens}


@router.post("/tokens")
async def dev_tokens(db: Session = Depends(get_db)) -> dict:
    _require_dev()

    def get_user_by_phone(phone: str) -> User:
        user = db.execute(select(User).where(User.phone == phone)).scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=500,
                detail=f"User with phone {phone} not found. Call /dev/seed first.",
            )
        return user

    passenger = get_user_by_phone("+351912345678")
    admin = get_user_by_phone("+351900000000")
    driver = get_user_by_phone("+351911111111")

    def make_token(user: User) -> str:
        data = create_access_token(subject=str(user.id), role=user.role.value)
        return data["token"]

    return {
        "passenger": make_token(passenger),
        "admin": make_token(admin),
        "driver": make_token(driver),
    }


@router.post("/auto-trip")
async def dev_auto_trip(db: Session = Depends(get_db)) -> dict:
    _require_dev()

    passenger = db.execute(
        select(User).where(User.phone == "+351912345678")
    ).scalar_one_or_none()
    admin = db.execute(
        select(User).where(User.phone == "+351900000000")
    ).scalar_one_or_none()
    driver = db.execute(
        select(User).where(User.phone == "+351911111111")
    ).scalar_one_or_none()

    if not passenger or not admin or not driver:
        raise HTTPException(
            status_code=500,
            detail="Seed users not found. Call /dev/seed first.",
        )

    driver_profile = db.execute(
        select(Driver).where(Driver.user_id == driver.id)
    ).scalar_one_or_none()
    if not driver_profile or driver_profile.status != DriverStatus.approved:
        raise HTTPException(
            status_code=500,
            detail="Driver not approved. Call /dev/seed first.",
        )

    origin_lat, origin_lng = _random_lisbon_coords()
    dest_lat, dest_lng = _random_lisbon_coords()
    payload = TripCreateRequest(
        origin_lat=origin_lat,
        origin_lng=origin_lng,
        destination_lat=dest_lat,
        destination_lng=dest_lng,
    )

    trip, _ = await create_trip_service(
        db=db,
        passenger_id=str(passenger.id),
        payload=payload,
    )
    trip_id = str(trip.id)

    assign_trip_service(db=db, trip_id=trip_id)
    trip, _ = accept_trip_service(
        db=db,
        driver_id=str(driver.id),
        trip_id=trip_id,
    )
    mark_trip_arriving_service(
        db=db,
        driver_id=str(driver.id),
        trip_id=trip_id,
    )
    start_trip_service(
        db=db,
        driver_id=str(driver.id),
        trip_id=trip_id,
    )
    complete_trip_service(
        db=db,
        driver_id=str(driver.id),
        trip_id=trip_id,
    )

    db.refresh(trip)
    payment = db.execute(
        select(Payment).where(Payment.trip_id == trip.id)
    ).scalar_one_or_none()

    return {
        "trip_id": trip_id,
        "final_status": trip.status.value,
        "payment_status": payment.status.value if payment else "unknown",
    }


@router.post("/promote-to-driver")
async def dev_promote_to_driver(
    phone: str = Query(..., description="Phone number of user to promote"),
    db: Session = Depends(get_db),
) -> dict:
    """Promote user to driver (create Driver profile + set role). For beta: motoristas use own phone, then organizer calls this."""
    _require_dev()
    user = db.execute(select(User).where(User.phone == phone)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail=f"User with phone {phone} not found")
    driver_profile = db.execute(
        select(Driver).where(Driver.user_id == user.id)
    ).scalar_one_or_none()
    if driver_profile:
        driver_profile.is_available = True
        user.role = Role.driver
        db.commit()
        return {"status": "ok", "message": "Driver already exists", "user_id": str(user.id)}
    user.role = Role.driver
    driver_profile = Driver(
        user_id=user.id,
        status=DriverStatus.approved,
        commission_percent=15,
    )
    db.add(driver_profile)
    db.commit()
    return {"status": "ok", "message": "User promoted to driver", "user_id": str(user.id)}


@router.get("/trips")
async def dev_list_trips(db: Session = Depends(get_db)) -> list[dict]:
    _require_dev()

    trips = db.execute(
        select(Trip)
        .options(joinedload(Trip.payment))
        .order_by(Trip.created_at.desc())
    ).scalars().unique().all()

    result = []
    for trip in trips:
        payment = trip.payment
        pi_id = payment.stripe_payment_intent_id if payment else None
        pi_preview = (pi_id[:10] + "...") if pi_id and len(pi_id) > 10 else pi_id
        result.append({
            "id": str(trip.id),
            "status": trip.status.value,
            "driver_id": str(trip.driver_id) if trip.driver_id else None,
            "started_at": trip.started_at.isoformat() if trip.started_at else None,
            "completed_at": trip.completed_at.isoformat() if trip.completed_at else None,
            "payment": {
                "status": payment.status.value if payment else None,
                "stripe_payment_intent_id": pi_preview,
            } if payment else None,
        })
    return result
