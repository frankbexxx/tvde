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
    dev_tools,
    driver_trips,
    health,
    passenger_trips,
    realtime,
    ws,
)
from app.api.routers.webhooks import stripe as stripe_webhook

import app.db.models  # noqa: F401
from app.core.config import settings
from sqlalchemy import text

from app.db.base import Base
from app.db.session import engine

app = FastAPI(title="Ride Sharing API", version="0.1.0")

# CORS for frontend on different origin (e.g. Render static site)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _dev_add_columns_if_missing() -> None:
    """Add new columns in dev without migrations. Idempotent (PG 9.6+)."""
    if settings.ENV != "dev":
        return
    try:
        with engine.connect() as conn:
            for stmt in [
                "ALTER TABLE trips ADD COLUMN IF NOT EXISTS distance_km NUMERIC(8,2)",
                "ALTER TABLE trips ADD COLUMN IF NOT EXISTS duration_min NUMERIC(8,2)",
                "ALTER TABLE payments ADD COLUMN IF NOT EXISTS driver_payout NUMERIC(10,2)",
                "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true NOT NULL",
            ]:
                conn.execute(text(stmt))
            conn.commit()
    except Exception as e:
        print(f"⚠️  Dev schema update (add columns): {e}")


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


app.openapi = custom_openapi

@app.on_event("startup")
def on_startup() -> None:
    print("ENGINE URL:", engine.url)
    Base.metadata.create_all(bind=engine)
    _dev_add_columns_if_missing()

    # Validate Stripe webhook secret (required in non-dev environments).
    if settings.ENV != "dev":
        if not settings.STRIPE_WEBHOOK_SECRET:
            raise RuntimeError(
                "STRIPE_WEBHOOK_SECRET is required in non-dev environments. "
                "Set it in .env or environment variables."
            )
    elif not settings.STRIPE_WEBHOOK_SECRET:
        print(
            "⚠️  WARNING: STRIPE_WEBHOOK_SECRET not set. "
            "Webhook validation will fail. "
            "Run 'stripe listen' to get the webhook secret."
        )

app.include_router(health.router)
app.include_router(dev_tools.router)
app.include_router(auth.router)
app.include_router(passenger_trips.router)
app.include_router(driver_trips.router)
app.include_router(admin.router)
app.include_router(realtime.router)
app.include_router(ws.router)
app.include_router(admin_ws.router)
app.include_router(stripe_webhook.router)

