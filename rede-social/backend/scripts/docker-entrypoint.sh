#!/bin/sh
# Prepara o container antes de iniciar a API.
set -e

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Aplicando migrations do banco..."
  alembic upgrade head
fi

if [ "${SEED_DEMO_DATA:-false}" = "true" ]; then
  python -m app.seed
fi

# Substitui o shell pelo comando final (uvicorn), que passa a receber os sinais do Docker.
exec "$@"
