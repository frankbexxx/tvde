"""Best-effort rate limits for auth endpoints (anti brute-force OTP / login).

Por processo (memória). Em produção multi-worker, combinar com limite no proxy quando possível.
"""

import time
from collections import defaultdict

from fastapi import HTTPException, Request, status

# (kind, ip, key_suffix) -> timestamps monotonic
_buckets: dict[tuple[str, str, str], list[float]] = defaultdict(list)

# Por IP+telefone (OTP / login BETA)
_MAX_OTP_REQUEST_PER_MINUTE = 12
_MAX_LOGIN_PER_MINUTE = 24
# Por IP (Google code exchange — sem telefone na chave)
_MAX_GOOGLE_EXCHANGE_PER_MINUTE = 30


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip() or "unknown"
    if request.client:
        return request.client.host or "unknown"
    return "unknown"


def _prune(timestamps: list[float], *, window_s: float, now: float) -> None:
    cutoff = now - window_s
    timestamps[:] = [t for t in timestamps if t > cutoff]


def check_otp_request_rate_limit(request: Request, phone: str) -> None:
    now = time.monotonic()
    ip = client_ip(request)
    key = phone.strip()[:32]
    bucket = _buckets[("otp_req", ip, key)]
    _prune(bucket, window_s=60.0, now=now)
    if len(bucket) >= _MAX_OTP_REQUEST_PER_MINUTE:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="rate_limit_otp_request",
        )
    bucket.append(now)


def check_beta_login_rate_limit(request: Request, phone: str) -> None:
    now = time.monotonic()
    ip = client_ip(request)
    key = phone.strip()[:32]
    bucket = _buckets[("beta_login", ip, key)]
    _prune(bucket, window_s=60.0, now=now)
    if len(bucket) >= _MAX_LOGIN_PER_MINUTE:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="rate_limit_login",
        )
    bucket.append(now)


def check_google_exchange_rate_limit(request: Request) -> None:
    now = time.monotonic()
    ip = client_ip(request)
    bucket = _buckets[("google_x", ip, "")]
    _prune(bucket, window_s=60.0, now=now)
    if len(bucket) >= _MAX_GOOGLE_EXCHANGE_PER_MINUTE:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="rate_limit_google_exchange",
        )
    bucket.append(now)
