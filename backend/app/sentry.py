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
- request_id entra como tag; JWT, email, telefone, GPS e body nao.
"""

from __future__ import annotations

import logging
import os
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from sentry_sdk._types import Event, Hint

logger = logging.getLogger(__name__)

_DROP_HEADER_NAMES = frozenset(
    {"authorization", "cookie", "set-cookie", "x-cron-secret", "proxy-authorization"}
)
_BLOCKED_CONTEXT_KEYS = frozenset(
    {
        "authorization",
        "jwt",
        "token",
        "access_token",
        "email",
        "phone",
        "telefone",
        "gps",
        "lat",
        "lng",
        "latitude",
        "longitude",
        "body",
        "request_body",
        "password",
        "secret",
    }
)


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
        before_send=filter_sentry_event,
    )
    logger.info("[sentry] initialized (env=%s release=%s)", environment, release or "unset")
    return True


def filter_sentry_event(event: Event, hint: Hint) -> Event | None:
    """Filtra 4xx e health checks; anexa request_id; remove PII residual."""
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

    rid = _request_id_from_ctx()
    if rid:
        tags = event.get("tags")
        if not isinstance(tags, dict):
            tags = {}
            event["tags"] = tags
        tags["request_id"] = rid

    return _scrub_event(event)


def tag_request_id(request_id: str | None) -> None:
    """Marca o scope do pedido. Sem efeito se o SDK nao estiver inicializado."""
    if not request_id:
        return
    try:
        import sentry_sdk
    except ImportError:
        return
    sentry_sdk.set_tag("request_id", request_id)


def capture_handled_exception(exc: BaseException, *, cron_job: str) -> None:
    """Uma captura para uma excepção já apanhada. O caller não a volta a lançar."""
    try:
        import sentry_sdk
    except ImportError:
        return
    with sentry_sdk.new_scope() as scope:
        scope.set_tag("cron_job", cron_job)
        rid = _request_id_from_ctx()
        if rid:
            scope.set_tag("request_id", rid)
        sentry_sdk.capture_exception(exc)


def add_context(**kwargs: Any) -> None:
    """Helper: anexa tags operacionais. Recusa chaves que possam levar PII."""
    try:
        import sentry_sdk
    except ImportError:
        return
    for key, value in kwargs.items():
        if value is None or key.lower() in _BLOCKED_CONTEXT_KEYS:
            continue
        sentry_sdk.set_tag(key, str(value))


def _request_id_from_ctx() -> str | None:
    from app.middleware.request_id import request_id_ctx

    return request_id_ctx.get()


def _scrub_event(event: Event) -> Event:
    request = event.get("request")
    if isinstance(request, dict):
        headers = request.get("headers")
        if isinstance(headers, dict):
            request["headers"] = {
                key: value
                for key, value in headers.items()
                if str(key).lower() not in _DROP_HEADER_NAMES
            }
        request.pop("data", None)
        request.pop("cookies", None)
        if "query_string" in request:
            request["query_string"] = ""
    user = event.get("user")
    if isinstance(user, dict):
        for key in ("email", "ip_address", "username"):
            user.pop(key, None)
    extra = event.get("extra")
    if isinstance(extra, dict):
        for key in list(extra):
            if str(key).lower() in _BLOCKED_CONTEXT_KEYS:
                extra.pop(key, None)
    return event
