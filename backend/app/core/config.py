from pathlib import Path

from pydantic import ConfigDict
from pydantic_settings import BaseSettings

# Resolve .env relative to backend/ (not cwd) so it works regardless of where uvicorn is started
_BASE_DIR = Path(__file__).resolve().parents[2]  # app/core/config.py -> backend/
_ENV_FILE = _BASE_DIR / ".env"


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=str(_ENV_FILE), extra="ignore")

    DATABASE_URL: str

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_MINUTES: int = 60

    OTP_SECRET: str
    OTP_EXPIRATION_MINUTES: int = 5

    STRIPE_SECRET_KEY: str
    STRIPE_WEBHOOK_SECRET: str | None = None
    STRIPE_MOCK: bool = False  # When True, skip Stripe API calls (simulator/testing only)

    ENV: str = "dev"
    ENABLE_DEV_TOOLS: bool = False  # When True, /dev/seed and /dev/tokens work in production (for field validation)
    BETA_MODE: bool = False  # When True, rate limit request_trip (5/min per user)

    # BETA mode for 15-20 real users (presential tests)
    ADMIN_PHONE: str | None = None  # e.g. +351924075365 — auto-admin, no approval
    MAX_BETA_USERS: int = 30
    DEFAULT_PASSWORD: str = "123456"  # Pre-filled for BETA testers

    # Future: confirm PaymentIntent at accept (frontend 3DS). When True, accept_trip
    # returns payment_intent_client_secret for frontend confirmation. Default False.
    ENABLE_CONFIRM_ON_ACCEPT: bool = False

    # Geographic radius (km) for driver–trip matching. Drivers see trips within this distance;
    # passengers are matched to drivers within this radius. Covers e.g. Lisbon metro (Oeiras, etc.).
    GEO_RADIUS_KM: float = 25.0

    # Multi-offer dispatch: number of drivers to send offers to.
    OFFER_TOP_N: int = 5
    # Offer timeout (seconds) before offer expires. Driver has this long to accept.
    OFFER_TIMEOUT_SECONDS: int = 15


settings = Settings()

