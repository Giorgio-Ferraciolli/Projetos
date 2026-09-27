from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine

from app import models  # noqa: F401  (registra todas as tabelas em Base.metadata)
from app.core.config import settings
from app.db.base import Base

config = context.config

if config.config_file_name is not None:
    # disable_existing_loggers=False preserva os loggers da aplicação (ex.: nos testes).
    fileConfig(config.config_file_name, disable_existing_loggers=False)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Gera o SQL sem conectar ao banco (alembic upgrade head --sql)."""
    context.configure(
        url=settings.database_url().render_as_string(hide_password=False),
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    # Os testes passam uma conexão pronta (banco de testes); no uso normal, criamos
    # uma engine a partir das variáveis de ambiente.
    connection = config.attributes.get("connection")
    if connection is not None:
        _run_with_connection(connection)
        return

    engine = create_engine(settings.database_url(), hide_parameters=True)
    with engine.connect() as connection:
        _run_with_connection(connection)
    engine.dispose()


def _run_with_connection(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
