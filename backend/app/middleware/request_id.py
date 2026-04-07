"""Request ID middleware — assigns unique ID to each request for tracing."""

import uuid
from contextvars import ContextVar
from starlette.middleware.base import BaseHTTPMiddleware


request_id_ctx: ContextVar[str | None] = ContextVar("request_id", default=None)


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Adds X-Request-ID header and request.state.request_id to every request."""

    async def dispatch(self, request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        token = request_id_ctx.set(request_id)
        try:
            response = await call_next(request)
        finally:
            request_id_ctx.reset(token)
        response.headers["X-Request-ID"] = request_id
        return response
