"""Simple in-memory rate limiter for request_trip. Always active to prevent abuse."""

import time
from collections import defaultdict

from fastapi import Depends, HTTPException

from app.api.deps import UserContext, get_current_user

# user_id -> list of timestamps (last 60 seconds)
_request_timestamps: dict[str, list[float]] = defaultdict(list)
_MAX_REQUESTS_PER_MINUTE = 5


async def check_request_trip_rate_limit(
    user: UserContext = Depends(get_current_user),
) -> None:
    """Dependency: raise 429 if rate exceeded. Always active."""
    now = time.monotonic()
    cutoff = now - 60.0  # 1 minute window

    timestamps = _request_timestamps[user.user_id]
    timestamps[:] = [t for t in timestamps if t > cutoff]

    if len(timestamps) >= _MAX_REQUESTS_PER_MINUTE:
        raise HTTPException(status_code=429, detail="rate_limit_exceeded")

    timestamps.append(now)
