# Ride Sharing Backend — Snapshot

## Secção 1: Estrutura de Diretórios

```
backend/
  app/
    __init__.py
    main.py
    .env
    api/
      __init__.py
      deps.py
      routers/
        __init__.py
        admin.py
        admin_ws.py
        auth.py
        driver_trips.py
        health.py
        passenger_trips.py
        realtime.py
        ws.py
    auth/
      __init__.py
      otp.py
      security.py
    db/
      __init__.py
      base.py
      session.py
      models/
        __init__.py
        audit_event.py
        driver.py
        otp.py
        payment.py
        trip.py
        user.py
    events/
      __init__.py
      base.py
      dispatcher.py
    models/
      __init__.py
      enums.py
    realtime/
      __init__.py
      admin_hub.py
      hub.py
    schemas/
      __init__.py
      auth.py
      common.py
      driver.py
      payment.py
      realtime.py
      trip.py
    services/
      __init__.py
      trips.py
  requirements.txt
```

## Secção 2: Código Fonte

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\__init__.py
```python
"""Backend application package."""

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\main.py
```python
from fastapi import FastAPI

from app.api.routers import (
    admin,
    admin_ws,
    auth,
    driver_trips,
    health,
    passenger_trips,
    realtime,
    ws,
)

from app.db.base import Base
from app.db.session import engine

import app.db.models  # noqa: F401

app = FastAPI(title="Ride Sharing API", version="0.1.0")

@app.on_event("startup")
def on_startup() -> None:
    print("ENGINE URL:", engine.url)
    Base.metadata.create_all(bind=engine)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(passenger_trips.router)
app.include_router(driver_trips.router)
app.include_router(admin.router)
app.include_router(realtime.router)
app.include_router(ws.router)
app.include_router(admin_ws.router)

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\api\__init__.py
```python
"""API layer."""

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\api\deps.py
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.security import decode_access_token
from app.db.models.user import User
from app.db.session import SessionLocal
from app.models.enums import Role, UserStatus


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/otp/verify")


class UserContext(BaseModel):
    user_id: str
    role: Role


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> UserContext:
    try:
        payload = decode_access_token(token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_token",
        ) from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_token",
        )

    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_token",
        )
    if user.status != UserStatus.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="blocked",
        )

    return UserContext(user_id=str(user.id), role=user.role)


def require_role(*roles: Role):
    async def _require(user: UserContext = Depends(get_current_user)) -> UserContext:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="forbidden",
            )
        return user

    return _require

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\api\routers\__init__.py
```python
"""API routers."""

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\api\routers\admin.py
```python
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_db, require_role
from app.models.enums import Role
from app.schemas.driver import DriverStatusResponse
from app.schemas.trip import TripActiveItem, TripStatusResponse
from app.services.trips import assign_trip


router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/drivers/{driver_id}/approve", response_model=DriverStatusResponse)
async def approve_driver(
    driver_id: str,
    user: UserContext = Depends(require_role(Role.admin)),
) -> DriverStatusResponse:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not implemented",
    )


@router.post("/drivers/{driver_id}/reject", response_model=DriverStatusResponse)
async def reject_driver(
    driver_id: str,
    user: UserContext = Depends(require_role(Role.admin)),
) -> DriverStatusResponse:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not implemented",
    )


@router.get("/trips/active", response_model=List[TripActiveItem])
async def list_active_trips(
    user: UserContext = Depends(require_role(Role.admin)),
) -> List[TripActiveItem]:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not implemented",
    )


@router.post("/trips/{trip_id}/assign", response_model=TripStatusResponse)
async def assign_trip_admin(
    trip_id: str,
    user: UserContext = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
) -> TripStatusResponse:
    trip = assign_trip(
        db=db,
        trip_id=trip_id,
    )
    return TripStatusResponse(trip_id=str(trip.id), status=trip.status)

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\api\routers\admin_ws.py
```python
from fastapi import APIRouter, WebSocket, status
from sqlalchemy import select

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
    except Exception:
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

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\api\routers\auth.py
```python
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.auth.otp import (
    generate_otp_code,
    hash_otp_code,
    otp_expiration_time,
    verify_otp_code,
)
from app.auth.security import create_access_token
from app.db.models.otp import OtpCode
from app.db.models.user import User
from app.models.enums import Role, UserStatus
from app.schemas.auth import (
    OtpRequest,
    OtpRequestResponse,
    OtpVerifyRequest,
    TokenResponse,
)


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/otp/request", response_model=OtpRequestResponse)
async def request_otp(
    payload: OtpRequest,
    db: Session = Depends(get_db),
) -> OtpRequestResponse:
    code = generate_otp_code()
    expires_at = otp_expiration_time()
    code_hash = hash_otp_code(payload.phone, code)

    otp = OtpCode(
        phone=payload.phone,
        code_hash=code_hash,
        expires_at=expires_at,
    )
    db.add(otp)
    db.commit()

    return OtpRequestResponse(request_id=str(otp.id), expires_at=expires_at)


@router.post("/otp/verify", response_model=TokenResponse)
async def verify_otp(
    payload: OtpVerifyRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    now = datetime.now(timezone.utc)
    otp: Optional[OtpCode] = db.execute(
        select(OtpCode)
        .where(
            OtpCode.phone == payload.phone,
            OtpCode.consumed_at.is_(None),
            OtpCode.expires_at > now,
        )
        .order_by(OtpCode.created_at.desc())
        .limit(1)
    ).scalar_one_or_none()

    if not otp or not verify_otp_code(payload.phone, payload.code, otp.code_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_otp",
        )

    otp.consumed_at = now

    user = db.execute(select(User).where(User.phone == payload.phone)).scalar_one_or_none()
    if not user:
        user = User(
            role=Role.passenger,
            name=payload.phone,
            phone=payload.phone,
            status=UserStatus.active,
        )
        db.add(user)

    if user.status != UserStatus.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="blocked",
        )

    db.commit()
    db.refresh(user)

    token_data = create_access_token(subject=str(user.id), role=user.role.value)

    return TokenResponse(
        access_token=token_data["token"],
        token_type="bearer",
        user_id=str(user.id),
        role=user.role,
        expires_at=token_data["expires_at"],
    )

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\api\routers\driver_trips.py
```python
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_db, require_role
from app.models.enums import Role
from app.schemas.trip import (
    TripAvailableItem,
    TripCompletionRequest,
    TripStatusResponse,
)
from app.services.trips import (
    accept_trip as accept_trip_service,
    cancel_trip_by_driver,
    list_available_trips,
)


router = APIRouter(prefix="/driver/trips", tags=["driver"])


@router.get("/available", response_model=List[TripAvailableItem])
async def list_available_trips(
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> List[TripAvailableItem]:
    trips = list_available_trips(
        db=db,
        driver_id=user.user_id,
    )
    return [
        TripAvailableItem(
            trip_id=str(trip.id),
            origin_lat=float(trip.origin_lat),
            origin_lng=float(trip.origin_lng),
            destination_lat=float(trip.destination_lat),
            destination_lng=float(trip.destination_lng),
            estimated_price=float(trip.estimated_price),
        )
        for trip in trips
    ]


@router.post("/{trip_id}/accept", response_model=TripStatusResponse)
async def accept_trip(
    trip_id: str,
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> TripStatusResponse:
    trip = accept_trip_service(
        db=db,
        driver_id=user.user_id,
        trip_id=trip_id,
    )
    return TripStatusResponse(trip_id=str(trip.id), status=trip.status)


@router.post("/{trip_id}/arriving", response_model=TripStatusResponse)
async def mark_arriving(
    trip_id: str,
    user: UserContext = Depends(require_role(Role.driver)),
) -> TripStatusResponse:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not implemented",
    )


@router.post("/{trip_id}/start", response_model=TripStatusResponse)
async def start_trip(
    trip_id: str,
    user: UserContext = Depends(require_role(Role.driver)),
) -> TripStatusResponse:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not implemented",
    )


@router.post("/{trip_id}/complete", response_model=TripStatusResponse)
async def complete_trip(
    trip_id: str,
    payload: TripCompletionRequest,
    user: UserContext = Depends(require_role(Role.driver)),
) -> TripStatusResponse:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not implemented",
    )


@router.post("/{trip_id}/cancel", response_model=TripStatusResponse)
async def cancel_trip(
    trip_id: str,
    user: UserContext = Depends(require_role(Role.driver)),
    db: Session = Depends(get_db),
) -> TripStatusResponse:
    trip = cancel_trip_by_driver(
        db=db,
        driver_id=user.user_id,
        trip_id=trip_id,
    )
    return TripStatusResponse(trip_id=str(trip.id), status=trip.status)

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\api\routers\health.py
```python
from fastapi import APIRouter


router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> dict:
    return {"status": "ok"}

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\api\routers\passenger_trips.py
```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import UserContext, get_db, require_role
from app.models.enums import Role
from app.schemas.trip import (
    TripCancelRequest,
    TripCreateRequest,
    TripCreateResponse,
    TripStatusResponse,
)
from app.services.trips import cancel_trip_by_passenger, create_trip as create_trip_service


router = APIRouter(prefix="/trips", tags=["passenger"])


@router.post("", response_model=TripCreateResponse)
async def create_trip(
    payload: TripCreateRequest,
    user: UserContext = Depends(require_role(Role.passenger)),
    db: Session = Depends(get_db),
) -> TripCreateResponse:
    trip, eta = create_trip_service(
        db=db,
        passenger_id=user.user_id,
        payload=payload,
    )
    return TripCreateResponse(
        trip_id=str(trip.id),
        status=trip.status,
        estimated_price=float(trip.estimated_price),
        eta=eta,
    )


@router.post("/{trip_id}/cancel", response_model=TripStatusResponse)
async def cancel_trip(
    trip_id: str,
    payload: TripCancelRequest,
    user: UserContext = Depends(require_role(Role.passenger)),
    db: Session = Depends(get_db),
) -> TripStatusResponse:
    _ = payload
    trip = cancel_trip_by_passenger(
        db=db,
        passenger_id=user.user_id,
        trip_id=trip_id,
    )
    return TripStatusResponse(trip_id=str(trip.id), status=trip.status)

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\api\routers\realtime.py
```python
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

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\api\routers\ws.py
```python
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

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\auth\__init__.py
```python
"""Auth utilities."""

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\auth\otp.py
```python
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

OTP_SECRET = os.getenv("OTP_SECRET", "change-me")
OTP_EXPIRATION_MINUTES = int(os.getenv("OTP_EXPIRATION_MINUTES", "5"))


def generate_otp_code(length: int = 6) -> str:
    min_value = 10 ** (length - 1)
    max_value = (10 ** length) - 1
    return str(secrets.randbelow(max_value - min_value + 1) + min_value)


def hash_otp_code(phone: str, code: str) -> str:
    message = f"{phone}:{code}".encode("utf-8")
    return hmac.new(OTP_SECRET.encode("utf-8"), message, hashlib.sha256).hexdigest()


def verify_otp_code(phone: str, code: str, code_hash: str) -> bool:
    expected = hash_otp_code(phone, code)
    return hmac.compare_digest(expected, code_hash)


def otp_expiration_time() -> datetime:
    return datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRATION_MINUTES)

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\auth\security.py
```python
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import jwt

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ACCESS_TOKEN_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_MINUTES", "60"))


def create_access_token(*, subject: str, role: str) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=JWT_ACCESS_TOKEN_MINUTES)
    payload = {"sub": subject, "role": role, "iat": now, "exp": expire}
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return {"token": token, "expires_at": expire}


def decode_access_token(token: str) -> Dict[str, Any]:
    return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\db\__init__.py
```python
"""Database package."""

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\db\base.py
```python
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\db\session.py
```python
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://user:password@localhost:5432/app",
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\db\models\__init__.py
```python
from app.db.models.audit_event import AuditEvent
from app.db.models.driver import Driver
from app.db.models.otp import OtpCode
from app.db.models.payment import Payment
from app.db.models.trip import Trip
from app.db.models.user import User

__all__ = ["User", "Driver", "Trip", "Payment", "OtpCode", "AuditEvent"]

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\db\models\audit_event.py
```python
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique audit event identifier.",
    )
    event_type: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        comment="Event type identifier.",
    )
    entity_type: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        comment="Entity type (e.g., trip).",
    )
    entity_id: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        comment="Entity identifier as string.",
    )
    payload: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        comment="Serialized event payload.",
    )
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        comment="Timestamp when event occurred.",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Persistence timestamp.",
    )


Index("ix_audit_events_entity", AuditEvent.entity_type, AuditEvent.entity_id)
Index("ix_audit_events_occurred_at", AuditEvent.occurred_at)

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\db\models\driver.py
```python
import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Numeric, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import DriverStatus


class Driver(Base):
    __tablename__ = "drivers"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
        comment="User identifier for the driver profile.",
    )
    status: Mapped[DriverStatus] = mapped_column(
        Enum(DriverStatus, name="driver_status_enum"),
        nullable=False,
        comment="Driver approval status.",
    )
    documents: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Document references or URLs.",
    )
    commission_percent: Mapped[float] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        comment="Commission percentage for this driver.",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Creation timestamp.",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
        comment="Updated on approval or contract changes.",
    )

    user: Mapped["User"] = relationship(back_populates="driver_profile")
    trips: Mapped[List["Trip"]] = relationship(back_populates="driver")


Index("ix_drivers_status", Driver.status)

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\db\models\otp.py
```python
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Index, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class OtpCode(Base):
    __tablename__ = "otp_codes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique OTP request identifier.",
    )
    phone: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        index=True,
        comment="Phone number used for OTP.",
    )
    code_hash: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        comment="Hashed OTP code.",
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        comment="OTP expiration timestamp.",
    )
    consumed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when OTP was used.",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Creation timestamp.",
    )


Index("ix_otp_codes_phone_expires", OtpCode.phone, OtpCode.expires_at)

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\db\models\payment.py
```python
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import PaymentStatus


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        UniqueConstraint("trip_id", name="uq_payments_trip_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique payment identifier.",
    )
    trip_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        comment="Associated trip identifier.",
    )
    total_amount: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        comment="Total charged amount.",
    )
    commission_amount: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        comment="Platform commission amount.",
    )
    driver_amount: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        comment="Driver payout amount.",
    )
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status_enum"),
        nullable=False,
        comment="Payment status.",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Creation timestamp.",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
        comment="Updated on payment status changes.",
    )

    trip: Mapped["Trip"] = relationship(back_populates="payment")

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\db\models\trip.py
```python
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Numeric, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import TripStatus


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique trip identifier.",
    )
    passenger_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        comment="Passenger user identifier.",
    )
    driver_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("drivers.user_id", ondelete="SET NULL"),
        nullable=True,
        comment="Assigned driver identifier (nullable until accepted).",
    )
    status: Mapped[TripStatus] = mapped_column(
        Enum(TripStatus, name="trip_status_enum"),
        nullable=False,
        comment="Lifecycle status of the trip.",
    )
    origin_lat: Mapped[float] = mapped_column(
        Numeric(9, 6),
        nullable=False,
        comment="Origin latitude.",
    )
    origin_lng: Mapped[float] = mapped_column(
        Numeric(9, 6),
        nullable=False,
        comment="Origin longitude.",
    )
    destination_lat: Mapped[float] = mapped_column(
        Numeric(9, 6),
        nullable=False,
        comment="Destination latitude.",
    )
    destination_lng: Mapped[float] = mapped_column(
        Numeric(9, 6),
        nullable=False,
        comment="Destination longitude.",
    )
    estimated_price: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        comment="Estimated price at request time.",
    )
    final_price: Mapped[Optional[float]] = mapped_column(
        Numeric(10, 2),
        nullable=True,
        comment="Final price after completion.",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Creation timestamp.",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
        comment="Updated on state transitions or price updates.",
    )

    passenger: Mapped["User"] = relationship(
        back_populates="passenger_trips",
        foreign_keys=[passenger_id],
    )
    driver: Mapped[Optional["Driver"]] = relationship(
        back_populates="trips",
        foreign_keys=[driver_id],
    )
    payment: Mapped[Optional["Payment"]] = relationship(
        back_populates="trip",
        uselist=False,
    )


Index("ix_trips_status", Trip.status)
Index("ix_trips_passenger_id", Trip.passenger_id)
Index("ix_trips_driver_id", Trip.driver_id)

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\db\models\user.py
```python
import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import DateTime, Enum, Index, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import Role, UserStatus


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique user identifier.",
    )
    role: Mapped[Role] = mapped_column(
        Enum(Role, name="role_enum"),
        nullable=False,
        comment="Active role for permissions.",
    )
    name: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
        comment="Display name.",
    )
    phone: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        unique=True,
        index=True,
        comment="Phone number used for OTP login.",
    )
    status: Mapped[UserStatus] = mapped_column(
        Enum(UserStatus, name="user_status_enum"),
        nullable=False,
        comment="Account status.",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Creation timestamp.",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
        comment="Updated on state changes or profile edits.",
    )

    driver_profile: Mapped[Optional["Driver"]] = relationship(
        back_populates="user",
        uselist=False,
    )
    passenger_trips: Mapped[List["Trip"]] = relationship(
        back_populates="passenger",
        foreign_keys="Trip.passenger_id",
    )


Index("ix_users_role_status", User.role, User.status)

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\events\__init__.py
```python
"""Event layer."""

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\events\base.py
```python
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class DomainEvent:
    name: str
    occurred_at: datetime

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\events\dispatcher.py
```python
from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable, Protocol

from app.db.models.audit_event import AuditEvent
from app.db.session import SessionLocal
from app.realtime.admin_hub import admin_hub
from app.realtime.hub import hub
from app.schemas.realtime import TripStatusChangedEvent


class EventProtocol(Protocol):
    event: str

    def model_dump(self) -> dict: ...


def _event_to_audit_payload(event: EventProtocol) -> dict:
    return event.model_dump()


def _event_entity(event: EventProtocol) -> tuple[str, str]:
    if isinstance(event, TripStatusChangedEvent):
        return "trip", event.trip_id
    return "unknown", "unknown"


def emit(event: EventProtocol) -> None:
    try:
        entity_type, entity_id = _event_entity(event)
        payload = _event_to_audit_payload(event)
        occurred_at = payload.get("timestamp") or datetime.now(timezone.utc)

        with SessionLocal() as db:
            audit_event = AuditEvent(
                event_type=event.event,
                entity_type=entity_type,
                entity_id=str(entity_id),
                payload=payload,
                occurred_at=occurred_at,
            )
            db.add(audit_event)
            db.commit()
    except Exception:
        return

    try:
        if isinstance(event, TripStatusChangedEvent):
            hub.publish(event)
            admin_hub.publish(event)
    except Exception:
        return


def emit_many(events: Iterable[EventProtocol]) -> None:
    for event in events:
        emit(event)

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\models\__init__.py
```python
"""Domain enums and model helpers."""

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\models\enums.py
```python
from enum import Enum


class Role(str, Enum):
    passenger = "passenger"
    driver = "driver"
    admin = "admin"


class UserStatus(str, Enum):
    active = "active"
    blocked = "blocked"


class DriverStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class TripStatus(str, Enum):
    requested = "requested"
    assigned = "assigned"
    accepted = "accepted"
    arriving = "arriving"
    ongoing = "ongoing"
    completed = "completed"
    cancelled = "cancelled"
    failed = "failed"


class PaymentStatus(str, Enum):
    pending = "pending"
    paid = "paid"
    failed = "failed"

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\realtime\__init__.py
```python
"""Realtime utilities."""

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\realtime\admin_hub.py
```python
from __future__ import annotations

import asyncio
from typing import Set

from fastapi import WebSocket

from app.schemas.realtime import TripStatusChangedEvent


class AdminRealtimeHub:
    def __init__(self) -> None:
        self._subscribers: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def subscribe(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._subscribers.add(websocket)

    async def unsubscribe(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._subscribers.discard(websocket)

    def publish(self, event: TripStatusChangedEvent) -> None:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            return
        loop.create_task(self._broadcast(event))

    async def _broadcast(self, event: TripStatusChangedEvent) -> None:
        async with self._lock:
            sockets = list(self._subscribers)

        if not sockets:
            return

        payload = {
            "trip_id": event.trip_id,
            "status": event.status,
            "timestamp": event.timestamp,
        }
        for websocket in sockets:
            try:
                await websocket.send_json(payload)
            except Exception:
                await self.unsubscribe(websocket)


admin_hub = AdminRealtimeHub()

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\realtime\hub.py
```python
from __future__ import annotations

import asyncio
from typing import Dict, Set

from fastapi import WebSocket

from app.schemas.realtime import TripStatusChangedEvent


class RealtimeHub:
    def __init__(self) -> None:
        self._subscriptions: Dict[str, Set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def subscribe(self, trip_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            self._subscriptions.setdefault(trip_id, set()).add(websocket)

    async def unsubscribe(self, trip_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            sockets = self._subscriptions.get(trip_id)
            if not sockets:
                return
            sockets.discard(websocket)
            if not sockets:
                self._subscriptions.pop(trip_id, None)

    def publish(self, event: TripStatusChangedEvent) -> None:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            return

        loop.create_task(self._broadcast(event))

    async def _broadcast(self, event: TripStatusChangedEvent) -> None:
        async with self._lock:
            sockets = list(self._subscriptions.get(event.trip_id, set()))

        if not sockets:
            return

        payload = {
            "trip_id": event.trip_id,
            "status": event.status,
            "timestamp": event.timestamp,
        }
        for websocket in sockets:
            try:
                await websocket.send_json(payload)
            except Exception:
                await self.unsubscribe(event.trip_id, websocket)


hub = RealtimeHub()

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\schemas\__init__.py
```python
"""Pydantic schemas for API payloads."""

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\schemas\auth.py
```python
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import Role


class OtpRequest(BaseModel):
    phone: str = Field(..., min_length=6, max_length=32)


class OtpRequestResponse(BaseModel):
    request_id: str
    expires_at: datetime


class OtpVerifyRequest(BaseModel):
    phone: str = Field(..., min_length=6, max_length=32)
    code: str = Field(..., min_length=4, max_length=8)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    role: Role
    expires_at: datetime

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\schemas\common.py
```python
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class LatLng(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)


class LocationUpdate(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)
    heading: Optional[float] = Field(None, ge=0.0, le=360.0)
    speed: Optional[float] = Field(None, ge=0.0)
    timestamp: Optional[datetime] = None

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\schemas\driver.py
```python
from pydantic import BaseModel

from app.models.enums import DriverStatus


class DriverStatusResponse(BaseModel):
    driver_id: str
    status: DriverStatus

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\schemas\payment.py
```python
from pydantic import BaseModel

from app.models.enums import PaymentStatus


class PaymentStatusResponse(BaseModel):
    trip_id: str
    status: PaymentStatus

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\schemas\realtime.py
```python
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.enums import TripStatus


class TripStatusChangedEvent(BaseModel):
    event: str = Field(default="trip.status_changed")
    trip_id: str
    status: TripStatus
    timestamp: datetime


class DriverLocationEvent(BaseModel):
    event: str = Field(default="driver.location")
    trip_id: str
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)
    heading: Optional[float] = Field(None, ge=0.0, le=360.0)
    speed: Optional[float] = Field(None, ge=0.0)
    timestamp: datetime

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\schemas\trip.py
```python
from typing import Optional

from pydantic import BaseModel, Field

from app.models.enums import TripStatus


class TripCreateRequest(BaseModel):
    origin_lat: float = Field(..., ge=-90.0, le=90.0)
    origin_lng: float = Field(..., ge=-180.0, le=180.0)
    destination_lat: float = Field(..., ge=-90.0, le=90.0)
    destination_lng: float = Field(..., ge=-180.0, le=180.0)


class TripCreateResponse(BaseModel):
    trip_id: str
    status: TripStatus
    estimated_price: float
    eta: int


class TripCancelRequest(BaseModel):
    reason: Optional[str] = Field(None, max_length=280)


class TripStatusResponse(BaseModel):
    trip_id: str
    status: TripStatus


class TripCompletionRequest(BaseModel):
    final_price: float = Field(..., gt=0.0)


class TripAvailableItem(BaseModel):
    trip_id: str
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float
    estimated_price: float


class TripActiveItem(BaseModel):
    trip_id: str
    status: TripStatus
    passenger_id: str
    driver_id: Optional[str] = None
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\services\__init__.py
```python
"""Service layer."""

```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\services\trips.py
```python
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.driver import Driver
from app.db.models.trip import Trip
from app.events.dispatcher import emit
from app.models.enums import DriverStatus, TripStatus
from app.schemas.realtime import TripStatusChangedEvent
from app.schemas.trip import TripCreateRequest


ACTIVE_PASSENGER_CANCEL = {
    TripStatus.requested,
    TripStatus.assigned,
    TripStatus.accepted,
    TripStatus.arriving,
}

ACTIVE_DRIVER_CANCEL = {
    TripStatus.accepted,
    TripStatus.arriving,
}


def _raise_invalid_state() -> None:
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="invalid_state",
    )


def _raise_not_found() -> None:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="not_found",
    )


def _estimate_trip(_: TripCreateRequest) -> tuple[float, int]:
    # Placeholder until distance/ETA calculation is implemented.
    return 0.0, 0


def create_trip(
    *,
    db: Session,
    passenger_id: str,
    payload: TripCreateRequest,
) -> tuple[Trip, int]:
    estimated_price, eta = _estimate_trip(payload)
    trip = Trip(
        passenger_id=passenger_id,
        status=TripStatus.requested,
        origin_lat=payload.origin_lat,
        origin_lng=payload.origin_lng,
        destination_lat=payload.destination_lat,
        destination_lng=payload.destination_lng,
        estimated_price=estimated_price,
        final_price=None,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    emit(
        TripStatusChangedEvent(
            trip_id=str(trip.id),
            status=trip.status,
            timestamp=datetime.now(timezone.utc),
        )
    )
    return trip, eta


def cancel_trip_by_passenger(
    *,
    db: Session,
    passenger_id: str,
    trip_id: str,
) -> Trip:
    trip = db.execute(
        select(Trip).where(Trip.id == trip_id, Trip.passenger_id == passenger_id)
    ).scalar_one_or_none()
    if not trip:
        _raise_not_found()
    if trip.status not in ACTIVE_PASSENGER_CANCEL:
        _raise_invalid_state()

    trip.status = TripStatus.cancelled
    db.commit()
    db.refresh(trip)
    emit(
        TripStatusChangedEvent(
            trip_id=str(trip.id),
            status=trip.status,
            timestamp=datetime.now(timezone.utc),
        )
    )
    return trip


def cancel_trip_by_driver(
    *,
    db: Session,
    driver_id: str,
    trip_id: str,
) -> Trip:
    trip = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one_or_none()
    if not trip or trip.driver_id != driver_id:
        _raise_not_found()
    if trip.status not in ACTIVE_DRIVER_CANCEL:
        _raise_invalid_state()

    trip.status = TripStatus.cancelled
    db.commit()
    db.refresh(trip)
    emit(
        TripStatusChangedEvent(
            trip_id=str(trip.id),
            status=trip.status,
            timestamp=datetime.now(timezone.utc),
        )
    )
    return trip


def accept_trip(
    *,
    db: Session,
    driver_id: str,
    trip_id: str,
) -> Trip:
    trip = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one_or_none()
    if not trip:
        _raise_not_found()
    if trip.status != TripStatus.assigned:
        _raise_invalid_state()
    if trip.driver_id is not None:
        _raise_invalid_state()

    driver = db.execute(select(Driver).where(Driver.user_id == driver_id)).scalar_one_or_none()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="forbidden",
        )

    trip.driver_id = driver_id
    trip.status = TripStatus.accepted
    db.commit()
    db.refresh(trip)
    emit(
        TripStatusChangedEvent(
            trip_id=str(trip.id),
            status=trip.status,
            timestamp=datetime.now(timezone.utc),
        )
    )
    return trip


def assign_trip(
    *,
    db: Session,
    trip_id: str,
) -> Trip:
    trip = db.execute(select(Trip).where(Trip.id == trip_id)).scalar_one_or_none()
    if not trip:
        _raise_not_found()
    if trip.status != TripStatus.requested:
        _raise_invalid_state()
    if trip.driver_id is not None:
        _raise_invalid_state()

    trip.status = TripStatus.assigned
    db.commit()
    db.refresh(trip)
    emit(
        TripStatusChangedEvent(
            trip_id=str(trip.id),
            status=trip.status,
            timestamp=datetime.now(timezone.utc),
        )
    )
    return trip


def list_available_trips(
    *,
    db: Session,
    driver_id: str,
) -> list[Trip]:
    driver = db.execute(select(Driver).where(Driver.user_id == driver_id)).scalar_one_or_none()
    if not driver or driver.status != DriverStatus.approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="forbidden",
        )

    trips = db.execute(
        select(Trip).where(Trip.status == TripStatus.assigned)
    ).scalars()
    return list(trips)

```

## Secção 3: Configuração

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\requirements.txt
```
fastapi
uvicorn[standard]

sqlalchemy>=2.0
psycopg2-binary

pydantic
python-dotenv

PyJWT
```

### c:\Users\frank\OneDrive\Ambiente de Trabalho\APP\backend\app\.env
```
DATABASE_URL=postgresql+psycopg2://ride:********@localhost:5432/ride_db

JWT_SECRET_KEY=********
JWT_ALGORITHM=HS256
JWT_EXPIRES_MINUTES=60
```

## Secção 4: Notas tecnicas

- Base de dados PostgreSQL implicita via `psycopg2-binary` e `DATABASE_URL`.
- Variaveis de ambiente esperadas: `DATABASE_URL`, `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `JWT_ACCESS_TOKEN_MINUTES`, `OTP_SECRET`, `OTP_EXPIRATION_MINUTES`.
- O `.env` usa `JWT_EXPIRES_MINUTES`, mas o codigo espera `JWT_ACCESS_TOKEN_MINUTES`.
