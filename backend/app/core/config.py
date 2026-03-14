from pydantic import ConfigDict
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", extra="ignore")

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


settings = Settings()

