from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_MINUTES: int = 60

    OTP_SECRET: str
    OTP_EXPIRATION_MINUTES: int = 5

    STRIPE_SECRET_KEY: str
    STRIPE_WEBHOOK_SECRET: str | None = None

    ENV: str = "dev"
    ENABLE_DEV_TOOLS: bool = False  # When True, /dev/seed and /dev/tokens work in production (for field validation)

    # Future: confirm PaymentIntent at accept (frontend 3DS). When True, accept_trip
    # returns payment_intent_client_secret for frontend confirmation. Default False.
    ENABLE_CONFIRM_ON_ACCEPT: bool = False

    class Config:
        env_file = ".env"
        extra = "ignore"  # Ignore extra fields in .env


settings = Settings()

