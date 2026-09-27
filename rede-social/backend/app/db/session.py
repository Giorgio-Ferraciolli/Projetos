"""Engine e sessões do banco de dados."""

from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

# pool_pre_ping evita erros com conexões derrubadas pelo MySQL após inatividade.
# hide_parameters impede que valores (ex.: hash de senha) apareçam em erros e logs.
engine = create_engine(
    settings.database_url(), pool_pre_ping=True, pool_recycle=3600, hide_parameters=True
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    """Dependência do FastAPI: uma sessão por requisição, sempre fechada no final."""
    with SessionLocal() as session:
        yield session
