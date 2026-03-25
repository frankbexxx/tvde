# ruff: noqa: E402  # Imports after load_dotenv intentional - env must load before app config
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

BASE_DIR = Path(__file__).resolve().parents[1]
env_path = BASE_DIR / ".env"
load_dotenv(dotenv_path=env_path)

from app.api.routers import (
    admin,
    admin_ws,
    auth,
    cron,
    debug_routes,
    dev_tools,
    driver_offers,
    driver_status,
    driver_trips,
    drivers,
    health,
    logs,
    matching,
    passenger_trips,
    ws,
)
from app.api.routers.webhooks import stripe as stripe_webhook
from app.middleware import RequestIDMiddleware

import app.db.models  # noqa: F401
from app.core.config import settings
from sqlalchemy import text

from sqlalchemy.exc import ProgrammingError

from app.db.base import Base
from app.db.session import engine

logger = logging.getLogger(__name__)


def _dev_add_columns_if_missing() -> None:
    """Add new columns without migrations. Idempotent (PG 9.6+). Runs on startup."""
    try:
        with engine.connect() as conn:
            for stmt in [
                "ALTER TABLE trips ADD COLUMN IF NOT EXISTS distance_km NUMERIC(8,2)",
                "ALTER TABLE trips ADD COLUMN IF NOT EXISTS duration_min NUMERIC(8,2)",
                "ALTER TABLE trips ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(280)",
                "ALTER TABLE trips ADD COLUMN IF NOT EXISTS cancellation_fee NUMERIC(10,2)",
                "ALTER TABLE trips ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(16)",
                "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS cancellation_count INTEGER DEFAULT 0 NOT NULL",
                "ALTER TABLE trips ADD COLUMN IF NOT EXISTS driver_rating INTEGER",
                "ALTER TABLE trips ADD COLUMN IF NOT EXISTS passenger_rating INTEGER",
                "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2)",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS avg_rating_as_passenger NUMERIC(3,2)",
                "ALTER TABLE payments ADD COLUMN IF NOT EXISTS driver_payout NUMERIC(10,2)",
                "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true NOT NULL",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS requested_role VARCHAR(32)",
            ]:
                conn.execute(text(stmt))
            conn.commit()
        # ALTER TYPE ADD VALUE cannot run inside transaction on PG < 12
        try:
            with engine.connect().execution_options(
                isolation_level="AUTOCOMMIT"
            ) as conn:
                conn.execute(text("ALTER TYPE user_status_enum ADD VALUE 'pending'"))
        except ProgrammingError:
            logger.debug(
                "user_status_enum 'pending' skip (already exists or unsupported)",
            )
    except Exception as e:
        print(f"[WARN] Schema update (add columns): {e}")


def custom_openapi() -> dict:
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        routes=app.routes,
    )
    security_schemes = (
        openapi_schema.get("components", {}).get("securitySchemes", {})
    )
    bearer_scheme = security_schemes.get("BearerAuth")
    if bearer_scheme and bearer_scheme.get("type") == "http":
        bearer_scheme["bearerFormat"] = "JWT"
        bearer_scheme["description"] = 'Paste: "Bearer <token>"'
    app.openapi_schema = openapi_schema
    return app.openapi_schema


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — log config for diagnostics (no secrets)
    _debug_logs = getattr(settings, "DEBUG_RUNTIME_LOGS", False)
    if settings.is_development_environment() or _debug_logs:
        print("\n=== TEST MODE READY ===")
        print("1. Criar trip (frontend)")
        print("2. Aceitar como driver")
        print("3. Seguir logs no terminal")
        print("4. No final ver SUMMARY")
        print("Opcional: GET /debug/trip/{trip_id}/logs")
        print("=======================\n")
    _dev = settings.dev_tools_router_enabled()
    _beta = getattr(settings, "BETA_MODE", False)
    print(
        f"[TVDE] config ENV={settings.ENV} ENVIRONMENT={settings.ENVIRONMENT!r} "
        f"prod={settings.is_production_environment()} dev_tools_mounted={_dev} BETA_MODE={_beta}"
    )
    try:
        Base.metadata.create_all(bind=engine)
    except ProgrammingError as e:
        if "already exists" not in str(e):
            raise
        print("[WARN] Schema: some objects already exist (ok)")
    _dev_add_columns_if_missing()

    _env_low = settings.ENV.strip().lower()
    if _env_low not in ("dev", "development"):
        if not settings.STRIPE_WEBHOOK_SECRET:
            raise RuntimeError(
                "STRIPE_WEBHOOK_SECRET is required when ENV is not dev. "
                "Set it in .env or environment variables."
            )
    elif not settings.STRIPE_WEBHOOK_SECRET:
        print(
            "[WARN] STRIPE_WEBHOOK_SECRET not set. "
            "Webhook validation will fail. "
            "Run 'stripe listen' to get the webhook secret."
        )
    yield
    # Shutdown (nothing to do for now)


app = FastAPI(title="Ride Sharing API", version="0.1.0", lifespan=lifespan)

app.openapi = custom_openapi


def _cors_allowed_origins_list() -> list[str]:
    """Origens a partir de CORS_ALLOWED_ORIGINS. Vírgulas; strip em cada segmento."""
    value = settings.CORS_ALLOWED_ORIGINS
    return [o.strip() for o in value.split(",") if o.strip()]


def _cors_middleware_params() -> dict:
    """A023: dev → * sem credentials (Bearer em header). Produção → lista explícita + credentials."""
    if settings.is_development_environment():
        return {"allow_origins": ["*"], "allow_credentials": False}
    origins = _cors_allowed_origins_list()
    if not origins:
        raise RuntimeError(
            "CORS_ALLOWED_ORIGINS must list at least one origin in production "
            "(comma-separated; no *)."
        )
    return {"allow_origins": origins, "allow_credentials": True}


_cors = _cors_middleware_params()

# Request ID for tracing (runs first on request)
app.add_middleware(RequestIDMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors["allow_origins"],
    allow_credentials=_cors["allow_credentials"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(cron.router)
app.include_router(logs.router)
if settings.debug_router_enabled():
    app.include_router(debug_routes.router)
if settings.dev_tools_router_enabled():
    app.include_router(dev_tools.router)
app.include_router(auth.router)
app.include_router(passenger_trips.router)
app.include_router(driver_trips.router)
app.include_router(driver_offers.router)
app.include_router(driver_status.router)
app.include_router(drivers.router)
app.include_router(matching.router)
app.include_router(admin.router)
app.include_router(ws.router)
app.include_router(admin_ws.router)
app.include_router(stripe_webhook.router)

