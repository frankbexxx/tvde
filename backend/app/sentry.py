"""
Sentry error tracking — inicializacao condicional.

Comportamento:
- So inicializa se SENTRY_DSN estiver definido no ambiente.
- Em dev local, nao configurar a variavel => Sentry fica desligado.
- Em producao (Render), configurar a env var => Sentry activo.

Decisoes para a BETA alpha:
- send_default_pii=False (nao envia IPs nem headers completos).
- traces_sample_rate=0.0 (sem performance monitoring, evita queimar quota).
- profiles_sample_rate=0.0.
- Ignora excepcoes client-side controladas que nao devem poluir o feed.
"""

from __future__ import annotations

import logging
import os
from typing import Any

logger = logging.getLogger(__name__)


def init_sentry() -> bool:
    """Inicializa Sentry se SENTRY_DSN estiver no ambiente. Retorna True se activo."""
    dsn = os.getenv("SENTRY_DSN", "").strip()
    if not dsn:
        return False

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration
    except ImportError:
        logger.warning("sentry-sdk nao instalado; SENTRY_DSN definido mas sem efeito.")
        return False

    environment = os.getenv("SENTRY_ENVIRONMENT") or os.getenv("ENV", "development")
    release = os.getenv("SENTRY_RELEASE") or None

    def _before_send(event: dict, hint: dict) -> dict | None:
        """Filtra ruido: 4xx client errors, health checks."""
        request = event.get("request") or {}
        url = str(request.get("url") or "")
        if "/health" in url or "/readiness" in url or "/metrics" in url:
            return None

        exc_info = hint.get("exc_info")
        if exc_info:
            exc = exc_info[1]
            status_code = getattr(exc, "status_code", None)
            if isinstance(status_code, int) and 400 <= status_code < 500:
                return None

        return event

    sentry_sdk.init(
        dsn=dsn,
        environment=environment,
        release=release,
        send_default_pii=False,
        traces_sample_rate=0.0,
        profiles_sample_rate=0.0,
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            StarletteIntegration(transaction_style="endpoint"),
        ],
        before_send=_before_send,
    )
    logger.info("[sentry] initialized (env=%s release=%s)", environment, release or "unset")
    return True


def add_context(**kwargs: Any) -> None:
    """Helper: anexa tags ao evento actual (ex.: trip_id, driver_id)."""
    try:
        import sentry_sdk
    except ImportError:
        return
    for key, value in kwargs.items():
        if value is not None:
            sentry_sdk.set_tag(key, str(value))
