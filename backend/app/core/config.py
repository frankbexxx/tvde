from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve .env relative to backend/ (not cwd) so it works regardless of where uvicorn is started
_BASE_DIR = Path(__file__).resolve().parents[2]  # app/core/config.py -> backend/
_ENV_FILE = _BASE_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(_ENV_FILE), extra="ignore")

    DATABASE_URL: str

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_MINUTES: int = 60

    OTP_SECRET: str
    OTP_EXPIRATION_MINUTES: int = 5

    STRIPE_SECRET_KEY: str
    STRIPE_WEBHOOK_SECRET: str | None = None
    STRIPE_MOCK: bool = (
        False  # When True, skip Stripe API calls (simulator/testing only)
    )

    ENV: str = "dev"
    # A023: optional override for security policy (CORS, dev routers). Values: dev | prod | production
    ENVIRONMENT: str | None = None
    # A023: em produção deve ser False. Em dev local, True acelera seed/tokens mesmo com ENV≠dev.
    ENABLE_DEV_TOOLS: bool = False
    BETA_MODE: bool = False  # When True, rate limit request_trip (5/min per user)

    # CORS: comma-separated origins (no "*"). Em produção (ENVIRONMENT/ENV=prod) é obrigatório ter pelo menos uma.
    # Em dev, o middleware pode usar "*" sem credentials (ver main.py).
    CORS_ALLOWED_ORIGINS: str = (
        "https://tvde-app-j51f.onrender.com,http://localhost:5173"
    )

    # BETA mode for 15-20 real users (presential tests)
    ADMIN_PHONE: str | None = None  # e.g. +351924075365 — auto-admin, no approval
    MAX_BETA_USERS: int = 30
    DEFAULT_PASSWORD: str = "123456"  # Pre-filled for BETA testers

    # Future: confirm PaymentIntent at accept (frontend 3DS). When True, accept_trip
    # returns payment_intent_client_secret for frontend confirmation. Default False.
    ENABLE_CONFIRM_ON_ACCEPT: bool = False

    # Geographic radius (km) for driver–trip matching. Drivers see trips within this distance;
    # passengers are matched to drivers within this radius. Covers e.g. Lisbon metro (Oeiras, etc.).
    GEO_RADIUS_KM: float = 50.0
    # Max age (seconds) for driver location. Older locations excluded from dispatch (A006 geo stability).
    LOCATION_MAX_AGE_SECONDS: int = 45

    # Multi-offer dispatch: number of drivers to send offers to.
    OFFER_TOP_N: int = 5
    # Offer timeout (seconds) before offer expires. Driver has this long to accept.
    OFFER_TIMEOUT_SECONDS: int = 15

    # Secret for cron-job.org (no JWT). GET /cron/jobs?secret=<CRON_SECRET>
    CRON_SECRET: str | None = None

    # Cleanup: delete audit_events older than N days
    AUDIT_EVENTS_RETENTION_DAYS: int = 90

    # Pricing engine: price = BASE_FARE + (distance_km × PRICE_PER_KM) + (duration_min × PRICE_PER_MIN)
    BASE_FARE: float = 1.50
    PRICE_PER_KM: float = 0.60
    PRICE_PER_MIN: float = 0.15

    # OSRM for real road distance/duration. When set, used instead of Haversine.
    # Example: https://router.project-osrm.org
    OSRM_BASE_URL: str | None = None

    # Cancellation: fee when passenger cancels after driver accepted (simulated, variable by distance).
    # Formula: max(CANCELLATION_FEE_MIN, estimated_price * CANCELLATION_FEE_PERCENT)
    CANCELLATION_FEE_PERCENT: float = 0.20  # 20% of estimated trip price
    CANCELLATION_FEE_MIN: float = 1.50

    # A007: When True, detailed runtime logs for real-user testing (trip flow, timestamps).
    DEBUG_RUNTIME_LOGS: bool = False

    def _raw_environment_label(self) -> str:
        if self.ENVIRONMENT is not None and str(self.ENVIRONMENT).strip():
            return str(self.ENVIRONMENT).strip().lower()
        return self.ENV.strip().lower()

    def is_production_environment(self) -> bool:
        """A023: prod se ENVIRONMENT ou ENV for prod/production."""
        return self._raw_environment_label() in ("prod", "production")

    def is_development_environment(self) -> bool:
        return not self.is_production_environment()

    def dev_tools_router_enabled(self) -> bool:
        """Montar /dev/* só fora de produção; localmente ENV=dev ou ENABLE_DEV_TOOLS."""
        if self.is_production_environment():
            return False
        env_l = self.ENV.strip().lower()
        return self.ENABLE_DEV_TOOLS or env_l in ("dev", "development")

    def debug_router_enabled(self) -> bool:
        """Montar /debug/* em dev/staging ou em beta controlado."""
        if self.is_production_environment():
            return bool(self.BETA_MODE)
        return True


settings = Settings()  # type: ignore[call-arg]
