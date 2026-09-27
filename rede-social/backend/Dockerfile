# Certificados raiz extras (opcional). O docker-compose.yml substitui este estágio vazio
# pela pasta infrastructure/certs, útil atrás de proxies corporativos com inspeção TLS.
FROM scratch AS certs

FROM python:3.13-slim

COPY --from=certs . /usr/local/share/ca-certificates/extra/
RUN update-ca-certificates

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Usuário sem privilégios de root para executar a aplicação.
RUN useradd --create-home --uid 1000 app

# Dependências primeiro: esta camada fica em cache enquanto os requirements não mudarem.
# INSTALL_DEV=true inclui pytest/ruff (usado no ambiente local para rodar os testes).
ARG INSTALL_DEV=false
COPY requirements.txt requirements-dev.txt ./
RUN if [ "$INSTALL_DEV" = "true" ]; then pip install -r requirements-dev.txt; \
    else pip install -r requirements.txt; fi

COPY . .
# Remove CRLF caso o arquivo tenha sido salvo no Windows.
RUN sed -i 's/\r$//' scripts/docker-entrypoint.sh \
    && chmod +x scripts/docker-entrypoint.sh \
    && mkdir -p /app/media \
    && chown -R app:app /app

USER app

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health')" || exit 1

ENTRYPOINT ["./scripts/docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
