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

    # Stripe key is required only when STRIPE_MOCK=false. In mock mode we skip Stripe API calls.
    STRIPE_SECRET_KEY: str | None = None
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
    ADMIN_PHONE: str | None = (
        None  # e.g. +351924075365 — auto super_admin backoffice, no approval
    )
    MAX_BETA_USERS: int = 30
    DEFAULT_PASSWORD: str = "123456"  # Legacy; not used for login after test-account MVP
    # When False in production, accounts without password_hash cannot use DEFAULT_PASSWORD.
    ALLOW_DEFAULT_PASSWORD_LOGIN: bool | None = None
    # Shared demo password for is_test_account users (seed/backfill only; stored as bcrypt hash).
    TEST_ACCOUNT_PASSWORD: str | None = None

    # Future: confirm PaymentIntent at accept (frontend 3DS). When True, accept_trip
    # returns payment_intent_client_secret for frontend confirmation. Default False.
    ENABLE_CONFIRM_ON_ACCEPT: bool = False

    # Geographic radius (km) for driver–trip matching. Drivers see trips within this distance;
    # passengers are matched to drivers within this radius. Covers e.g. Lisbon metro (Oeiras, etc.).
    GEO_RADIUS_KM: float = 50.0
    # Max distance (m) from trip pickup for POST /driver/trips/{id}/start. Slightly above the
    # frontend gate (~50 m) so minor GPS jitter does not false-reject.
    DRIVER_START_TRIP_MAX_DISTANCE_M: float = 70.0
    # Max age (seconds) for driver location. Older locations excluded from dispatch (A006 geo stability).
    LOCATION_MAX_AGE_SECONDS: int = 45

    # Multi-offer dispatch: number of drivers to send offers to.
    OFFER_TOP_N: int = 5
    # Offer timeout (seconds) before offer expires. Driver has this long to accept.
    # B1 (alpha 2026-04-25): subido de 15→60 para eliminar a janela (~10s) em que, após
    # expirar a oferta, a viagem desaparecia do ecrã do motorista antes de redespachar.
    OFFER_TIMEOUT_SECONDS: int = 60
    # CI Playwright: com OFFER_TIMEOUT_SECONDS baixo no env, usar max(base, floor) ao criar ofertas.
    E2E_KEEP_OFFERS_ALIVE: bool = False
    E2E_OFFER_TIMEOUT_FLOOR_SECONDS: int = 120

    # Local driver document uploads (Onda D — no S3)
    UPLOAD_DIR: str = "./uploads"

    # Minimum seconds between redispatch attempts for the same trip (zero-offer recovery).
    # B1 (alpha 2026-04-25): descido de 10→5 para reduzir o gap se a oferta expirar.
    REDISPATCH_MIN_INTERVAL_SECONDS: int = 5

    # Secret for cron-job.org (no JWT). GET /cron/jobs?secret=<CRON_SECRET>
    CRON_SECRET: str | None = None

    # Cleanup: delete audit_events older than N days (M2 provisional: 2 years)
    AUDIT_EVENTS_RETENTION_DAYS: int = 730

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

    # Rotacional v2: mensagens extra para o cabeçalho (JSON em env). Ver GET /rotacional/messages.
    # Exemplo: [{"text":"IPMA: aviso amarelo — aguaceiros.","source":"meteo"}]
    ROTACIONAL_FEED_JSON: str = ""

    # Rotacional v3: URL opcional (JSON array de {text, source?}); cron preenche cache em BD.
    ROTACIONAL_V3_FETCH_URL: str = ""
    ROTACIONAL_V3_FETCH_TIMEOUT_SECONDS: float = 8.0

    # M2-L3: rolling 24h (UTC); segments arriving+ongoing (provisional policy).
    # When True: calculate, register segments, warnings; no auto fixed 11h rest.
    ENABLE_DRIVING_HOURS_COMPLIANCE: bool = True
    # A3-D04-REV1 / M2-L3: HTTP block on online/accept when limit reached.
    # Default False — WARN+RECORD; enforcement M2 still pending.
    # True = 409 driving_hours_blocked.
    ENABLE_DRIVING_HOURS_ENFORCEMENT: bool = False

    # PF3D-3A — vehicle document compliance gates (online / matching / accept).
    # Default OFF: production-safe; enable only for controlled dev/test/smoke.
    ENABLE_VEHICLE_COMPLIANCE_GATES: bool = False

    # B2 next-trip chaining (groundwork only — no runtime consumers yet).
    # Default OFF: zero behaviour change until B2-SPIKE / B2-MATCH wire these up.
    # See docs/architecture/B2_PRODUCT_DECISIONS_2026-08-04.md
    ENABLE_NEXT_TRIP_CHAINING: bool = False
    # Max ETA minutes to pickup for a chain offer (V1 product default = 12). Unused until matching reads it.
    NEXT_TRIP_MAX_PICKUP_ETA_MINUTES: int = 12

    # Login Google (OAuth2 authorization code). Ambos obrigatórios para activar POST /auth/google/exchange.
    GOOGLE_OAUTH_CLIENT_ID: str = ""
    GOOGLE_OAUTH_CLIENT_SECRET: str = ""

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

    def allow_default_password_login(self) -> bool:
        """Dev: True by default. Production: False unless ALLOW_DEFAULT_PASSWORD_LOGIN=true."""
        if self.ALLOW_DEFAULT_PASSWORD_LOGIN is not None:
            return bool(self.ALLOW_DEFAULT_PASSWORD_LOGIN)
        return not self.is_production_environment()

    def is_forbidden_default_password(self, password: str) -> bool:
        """Block DEFAULT_PASSWORD in production even when login is otherwise allowed."""
        if not self.is_production_environment():
            return False
        return password == self.DEFAULT_PASSWORD

    def is_owner_phone(self, phone: str) -> bool:
        admin_phone = self.ADMIN_PHONE
        if not admin_phone:
            return False
        return admin_phone.strip() == phone.strip()

    def resolved_test_account_password(self) -> str:
        pwd = self.TEST_ACCOUNT_PASSWORD
        if not pwd or not str(pwd).strip():
            raise RuntimeError("TEST_ACCOUNT_PASSWORD is not configured")
        return str(pwd).strip()


settings = Settings()  # type: ignore[call-arg]
