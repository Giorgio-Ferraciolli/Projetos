"""Logs estruturados em JSON, escritos no stdout.

Logs em JSON no stdout são o formato mais simples de coletar: o Grafana Alloy lê os
logs dos containers Docker e envia para o Loki (Grafana Cloud) já com os campos
separados (level, logger, request_id, ...), sem precisar de parsing com regex.
"""

import json
import logging
import sys
from contextvars import ContextVar
from datetime import UTC, datetime

# Id da requisição atual; é incluído automaticamente em todos os logs emitidos durante ela.
request_id_var: ContextVar[str | None] = ContextVar("request_id", default=None)

# Atributos padrão de LogRecord que não devem ser repetidos como campos "extra".
_STANDARD_ATTRS = set(logging.makeLogRecord({}).__dict__) | {"message", "asctime", "color_message"}


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        entry = {
            "timestamp": datetime.fromtimestamp(record.created, UTC).isoformat(),
            "level": record.levelname.lower(),
            "logger": record.name,
            "message": record.getMessage(),
        }
        if request_id := request_id_var.get():
            entry["request_id"] = request_id
        # Campos passados via logger.info("...", extra={...}) viram chaves do JSON.
        entry.update(
            {key: value for key, value in record.__dict__.items() if key not in _STANDARD_ATTRS}
        )
        if record.exc_info:
            entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(entry, ensure_ascii=False, default=str)


class TextFormatter(logging.Formatter):
    def __init__(self) -> None:
        super().__init__("%(asctime)s %(levelname)-8s %(name)s: %(message)s")


def setup_logging(level: str, log_format: str) -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter() if log_format == "json" else TextFormatter())

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level.upper())

    # Os logs de acesso são emitidos pelo nosso middleware (com request_id e duração).
    logging.getLogger("uvicorn.access").disabled = True
    for name in ("uvicorn", "uvicorn.error"):
        logging.getLogger(name).handlers = []
        logging.getLogger(name).propagate = True
