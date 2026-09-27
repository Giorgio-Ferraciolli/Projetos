"""Ponto único de configuração de observabilidade.

Hoje: logs estruturados (JSON) com request_id e log de acesso por requisição.

Próximo passo (ver README, seção Observabilidade): instrumentar com OpenTelemetry
(opentelemetry-instrumentation-fastapi / -sqlalchemy) e exportar métricas e traces via
OTLP para o Grafana Alloy (infrastructure/alloy), que encaminha ao Grafana Cloud.
Essa configuração deve ser adicionada aqui, em `setup_observability`.
"""

from fastapi import FastAPI

from app.core.config import Settings
from app.observability.logging import setup_logging
from app.observability.middleware import RequestContextMiddleware


def setup_observability(app: FastAPI, settings: Settings) -> None:
    setup_logging(settings.log_level, settings.log_format)
    app.add_middleware(RequestContextMiddleware)
