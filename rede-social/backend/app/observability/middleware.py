import logging
import re
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.observability.logging import request_id_var

logger = logging.getLogger("app.access")
error_logger = logging.getLogger("app.errors")

REQUEST_ID_HEADER = "X-Request-ID"
_VALID_REQUEST_ID = re.compile(r"[A-Za-z0-9._-]{8,64}")
_UNLOGGED_PATHS = {"/api/health", "/api/health/ready"}


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Gera um id por requisição, registra um log de acesso e trata erros inesperados.

    O id é devolvido no header X-Request-ID (inclusive em erros 500), o que ajuda a
    relacionar um erro visto no navegador com a linha de log correspondente no servidor.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Reaproveita o id vindo do proxy (nginx) se for válido; senão, gera um novo.
        incoming_id = request.headers.get(REQUEST_ID_HEADER, "")
        request_id = incoming_id if _VALID_REQUEST_ID.fullmatch(incoming_id) else uuid.uuid4().hex
        token = request_id_var.set(request_id)
        started = time.perf_counter()
        try:
            try:
                response = await call_next(request)
            except Exception:
                # Nunca devolvemos detalhes internos (stack trace, SQL) para o cliente.
                error_logger.exception("Erro inesperado em %s %s", request.method, request.url.path)
                response = JSONResponse(
                    {"detail": "Erro interno. Tente novamente mais tarde."}, status_code=500
                )
            response.headers[REQUEST_ID_HEADER] = request_id
            response.headers["X-Content-Type-Options"] = "nosniff"
            _log_access(request, response.status_code, started)
            return response
        finally:
            request_id_var.reset(token)


def _log_access(request: Request, status_code: int, started: float) -> None:
    if request.url.path in _UNLOGGED_PATHS:
        return
    logger.info(
        "%s %s %s",
        request.method,
        request.url.path,
        status_code,
        extra={
            "http_method": request.method,
            "http_path": request.url.path,
            "http_status": status_code,
            "duration_ms": round((time.perf_counter() - started) * 1000, 2),
        },
    )
