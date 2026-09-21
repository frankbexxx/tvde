"""L-SEC-11: fail-fast when multi-worker would multiply in-memory rate limits.

OTP request/verify, login, Google exchange, and trip create counters live in
process memory. Deployed multi-worker (or equivalent) is incompatible until a
shared store exists. Horizontal instance count is *not* detected here.
"""

from __future__ import annotations

import os
import sys

_RATE_LIMIT_SURFACES = (
    "OTP request/verify, login, Google exchange, trip create"
)

_ERROR_TEMPLATE = (
    "L-SEC-11: in-memory rate-limit state is process-local "
    f"({_RATE_LIMIT_SURFACES}). "
    "Detected multi-worker configuration ({detail}). "
    "Effective limits would multiply per process. "
    "Keep WEB_CONCURRENCY=1 / single uvicorn worker, or introduce a shared "
    "rate-limit store before scale-out."
)


def parse_positive_int(raw: str | None, *, default: int = 1) -> int:
    """Parse concurrency/worker count; empty/invalid → default (typically 1)."""
    if raw is None:
        return default
    text = str(raw).strip()
    if not text:
        return default
    try:
        value = int(text)
    except ValueError:
        return default
    if value < 1:
        return default
    return value


def workers_from_argv(argv: list[str] | None = None) -> int | None:
    """Return uvicorn/gunicorn-style ``--workers N`` from argv, if present."""
    args = list(sys.argv if argv is None else argv)
    for i, arg in enumerate(args):
        if arg == "--workers" and i + 1 < len(args):
            return parse_positive_int(args[i + 1], default=1)
        if arg.startswith("--workers="):
            return parse_positive_int(arg.split("=", 1)[1], default=1)
    return None


def assert_single_worker_for_in_memory_rate_limits(
    *,
    is_deployed: bool,
    web_concurrency: str | None = None,
    argv: list[str] | None = None,
) -> None:
    """Raise ``RuntimeError`` in deployed envs when workers would be > 1.

    No-op for local/dev/test (``is_deployed=False``). Does not attempt to detect
    horizontal instance count.
    """
    if not is_deployed:
        return

    if web_concurrency is None:
        web_concurrency = os.environ.get("WEB_CONCURRENCY")
    concurrency = parse_positive_int(web_concurrency, default=1)
    if concurrency > 1:
        raise RuntimeError(
            _ERROR_TEMPLATE.format(detail=f"WEB_CONCURRENCY={concurrency}")
        )

    workers = workers_from_argv(argv)
    if workers is not None and workers > 1:
        raise RuntimeError(
            _ERROR_TEMPLATE.format(detail=f"--workers={workers}")
        )
