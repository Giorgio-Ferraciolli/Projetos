"""Fixtures compartilhadas pelos testes.

Os testes usam um banco MySQL separado (<DB_NAME>_test, criado pelo script em
infrastructure/mysql/init). O schema é criado pelas próprias migrations, o que também
testa se elas funcionam. Cada teste começa com as tabelas vazias.
"""

import itertools
from collections.abc import Callable, Iterator
from io import BytesIO
from pathlib import Path
from typing import Any

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import Engine, create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.db.session import get_db
from app.main import app
from app.storage import LocalStorage, get_storage

BACKEND_DIR = Path(__file__).resolve().parents[1]
TABLES = ["post_likes", "posts", "community_members", "communities", "users"]
DEFAULT_PASSWORD = "senha-segura-123"

_user_counter = itertools.count(1)
_community_counter = itertools.count(1)


@pytest.fixture(scope="session")
def engine() -> Iterator[Engine]:
    engine = create_engine(settings.database_url(settings.test_db_name), pool_pre_ping=True)
    alembic_config = Config(str(BACKEND_DIR / "alembic.ini"))
    with engine.begin() as connection:
        alembic_config.attributes["connection"] = connection
        command.downgrade(alembic_config, "base")
        command.upgrade(alembic_config, "head")
    yield engine
    engine.dispose()


@pytest.fixture(autouse=True)
def clean_database(engine: Engine) -> Iterator[None]:
    yield
    with engine.begin() as connection:
        connection.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
        for table in TABLES:
            connection.execute(text(f"TRUNCATE TABLE {table}"))
        connection.execute(text("SET FOREIGN_KEY_CHECKS = 1"))


@pytest.fixture
def session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@pytest.fixture
def db_session(session_factory: sessionmaker[Session]) -> Iterator[Session]:
    with session_factory() as session:
        yield session


@pytest.fixture
def storage(tmp_path: Path) -> LocalStorage:
    return LocalStorage(root=tmp_path / "media", base_url="/media")


@pytest.fixture
def make_client(
    session_factory: sessionmaker[Session], storage: LocalStorage
) -> Iterator[Callable[[], TestClient]]:
    """Cria clientes HTTP independentes (cada um com seus cookies = um usuário)."""

    def override_get_db() -> Iterator[Session]:
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_storage] = lambda: storage
    clients: list[TestClient] = []

    def factory() -> TestClient:
        client = TestClient(app)
        clients.append(client)
        return client

    yield factory
    for client in clients:
        client.close()
    app.dependency_overrides.clear()


@pytest.fixture
def client(make_client: Callable[[], TestClient]) -> TestClient:
    """Cliente anônimo (sem sessão)."""
    return make_client()


@pytest.fixture
def register_user(make_client: Callable[[], TestClient]) -> Callable[..., TestClient]:
    """Cadastra um usuário e devolve um cliente já autenticado como ele.

    O JSON do cadastro fica disponível em `client.user`.
    """

    def factory(**overrides: Any) -> TestClient:
        client = make_client()
        response = client.post("/api/auth/register", json=user_payload(**overrides))
        assert response.status_code == 201, response.text
        client.user = response.json()  # type: ignore[attr-defined]
        return client

    return factory


@pytest.fixture
def auth_client(register_user: Callable[..., TestClient]) -> TestClient:
    return register_user()


def user_payload(**overrides: Any) -> dict[str, Any]:
    number = next(_user_counter)
    payload = {
        "name": f"Usuário {number}",
        "username": f"user{number}",
        "email": f"user{number}@example.com",
        "password": DEFAULT_PASSWORD,
        "birth_date": "1995-05-20",
        "bio": "Olá!",
    }
    payload.update(overrides)
    return payload


def image_bytes(
    image_format: str = "PNG", size: tuple[int, int] = (64, 48), color: str = "purple"
) -> bytes:
    output = BytesIO()
    Image.new("RGB", size, color).save(output, format=image_format)
    return output.getvalue()


def png_file(size: tuple[int, int] = (64, 48), color: str = "purple") -> tuple[str, bytes, str]:
    """Arquivo PNG no formato aceito por `files=` do cliente HTTP: (nome, bytes, tipo)."""
    return ("imagem.png", image_bytes("PNG", size, color), "image/png")


def stored_file(storage: LocalStorage, url: str) -> Path:
    """Caminho no disco do arquivo publicado em `url` (ex.: /media/posts/abc.png)."""
    return storage.root / url.removeprefix(f"{storage.base_url}/")


def create_post(client: TestClient, **data: Any) -> dict[str, Any]:
    """Publica um post de texto (aceita `caption` e `community_id`) e devolve o JSON."""
    data.setdefault("caption", "Minha publicação")
    response = client.post("/api/posts", data=data)
    assert response.status_code == 201, response.text
    return response.json()


def create_community(client: TestClient, **data: Any) -> dict[str, Any]:
    """Cria uma comunidade (aceita `name` e `description`) e devolve o JSON."""
    number = next(_community_counter)
    form = {"name": f"Comunidade {number}", "description": "Comunidade criada nos testes."}
    form.update(data)
    response = client.post("/api/communities", data=form)
    assert response.status_code == 201, response.text
    return response.json()
