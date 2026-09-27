from collections.abc import Callable
from datetime import UTC, date, datetime, timedelta

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import JWT_ALGORITHM
from app.models import User
from tests.conftest import DEFAULT_PASSWORD, user_payload

COOKIE = settings.auth_cookie_name
INVALID_CREDENTIALS = "E-mail/usuário ou senha incorretos."


def make_token(user_id: int, expires_in: timedelta, secret_key: str = settings.secret_key) -> str:
    """Gera um JWT como o da aplicação, permitindo escolher validade e chave."""
    now = datetime.now(UTC)
    payload = {"sub": str(user_id), "iat": now, "exp": now + expires_in}
    return jwt.encode(payload, secret_key, algorithm=JWT_ALGORITHM)


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# ---------- Cadastro ----------


def test_register_creates_user_and_starts_session(client: TestClient) -> None:
    payload = user_payload(username="Maria.Silva", email="Maria.Silva@Example.COM")

    response = client.post("/api/auth/register", json=payload)

    assert response.status_code == 201
    user = response.json()
    assert user["name"] == payload["name"]
    assert user["username"] == "maria.silva"
    assert user["email"] == "maria.silva@example.com"
    assert "password" not in user
    assert "password_hash" not in user
    # O cookie de sessão é httpOnly e SameSite=Lax.
    set_cookie = response.headers["set-cookie"].lower()
    assert "httponly" in set_cookie
    assert "samesite=lax" in set_cookie
    assert client.get("/api/users/me").status_code == 200


def test_register_with_taken_email_returns_409(
    register_user: Callable[..., TestClient], client: TestClient
) -> None:
    register_user(email="repetido@example.com")

    response = client.post("/api/auth/register", json=user_payload(email="REPETIDO@example.com"))

    assert response.status_code == 409
    assert response.json()["detail"] == "Este e-mail já está em uso."


def test_register_with_taken_username_ignoring_case_returns_409(
    register_user: Callable[..., TestClient], client: TestClient
) -> None:
    register_user(username="joana")

    response = client.post("/api/auth/register", json=user_payload(username="JOANA"))

    assert response.status_code == 409
    assert response.json()["detail"] == "Este nome de usuário já está em uso."


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("birth_date", (date.today() - timedelta(days=12 * 365)).isoformat()),
        ("birth_date", (date.today() + timedelta(days=1)).isoformat()),
        ("password", "curta"),
        ("username", "nome com espaço"),
        ("username", "me"),
        ("username", "Admin"),
        ("email", "email-invalido"),
    ],
    ids=[
        "under-13",
        "future-birth-date",
        "short-password",
        "invalid-username-chars",
        "reserved-username-me",
        "reserved-username-admin",
        "invalid-email",
    ],
)
def test_register_with_invalid_data_returns_422(client: TestClient, field: str, value: str) -> None:
    response = client.post("/api/auth/register", json=user_payload(**{field: value}))

    assert response.status_code == 422
    body = response.json()
    assert body["detail"] == "Verifique os dados informados."
    assert [error["field"] for error in body["errors"]] == [field]


def test_register_under_13_explains_minimum_age(client: TestClient) -> None:
    twelve_years_old = (date.today() - timedelta(days=12 * 365)).isoformat()

    response = client.post("/api/auth/register", json=user_payload(birth_date=twelve_years_old))

    assert response.json()["errors"][0]["message"] == "É preciso ter pelo menos 13 anos."


def test_password_is_stored_as_argon2_hash(client: TestClient, db_session: Session) -> None:
    payload = user_payload()

    client.post("/api/auth/register", json=payload)

    user = db_session.scalar(select(User).where(User.username == payload["username"]))
    assert user is not None
    assert user.password_hash != payload["password"]
    assert user.password_hash.startswith("$argon2")


# ---------- Login e logout ----------


@pytest.mark.parametrize("login_field", ["email", "username"])
def test_login_with_email_or_username(
    register_user: Callable[..., TestClient], client: TestClient, login_field: str
) -> None:
    user = register_user().user
    # Maiúsculas não importam: e-mail e username são guardados em minúsculas.
    credentials = {"login": user[login_field].upper(), "password": DEFAULT_PASSWORD}

    response = client.post("/api/auth/login", json=credentials)

    assert response.status_code == 200
    assert response.json()["id"] == user["id"]
    assert client.cookies.get(COOKIE)
    assert client.get("/api/users/me").json()["id"] == user["id"]


def test_login_with_wrong_password_returns_401(
    register_user: Callable[..., TestClient], client: TestClient
) -> None:
    user = register_user().user

    response = client.post(
        "/api/auth/login", json={"login": user["email"], "password": "senha-errada"}
    )

    assert response.status_code == 401
    assert response.json()["detail"] == INVALID_CREDENTIALS
    assert client.cookies.get(COOKIE) is None


def test_login_with_unknown_user_gives_same_error_as_wrong_password(client: TestClient) -> None:
    response = client.post(
        "/api/auth/login", json={"login": "ninguem@example.com", "password": "senha-errada"}
    )

    # Mesma mensagem do caso de senha errada: não revela quais contas existem.
    assert response.status_code == 401
    assert response.json()["detail"] == INVALID_CREDENTIALS


def test_logout_clears_session(auth_client: TestClient) -> None:
    response = auth_client.post("/api/auth/logout")

    assert response.status_code == 204
    assert auth_client.cookies.get(COOKIE) is None
    assert auth_client.get("/api/users/me").status_code == 401


# ---------- Acesso a rotas protegidas ----------


def test_protected_endpoint_without_session_returns_401(client: TestClient) -> None:
    response = client.get("/api/users/me")

    assert response.status_code == 401
    assert response.json()["detail"] == "Não autenticado."
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_garbage_session_cookie_returns_401(client: TestClient) -> None:
    client.cookies.set(COOKIE, "isto-nao-e-um-jwt")

    response = client.get("/api/users/me")

    assert response.status_code == 401
    assert response.json()["detail"] == "Sua sessão expirou. Faça login novamente."


def test_token_signed_with_another_key_returns_401(
    register_user: Callable[..., TestClient], client: TestClient
) -> None:
    user = register_user().user
    forged = make_token(user["id"], timedelta(minutes=5), secret_key="x" * 32)

    response = client.get("/api/users/me", headers=bearer(forged))

    assert response.status_code == 401


def test_expired_token_returns_401(
    register_user: Callable[..., TestClient], client: TestClient
) -> None:
    user = register_user().user
    valid = make_token(user["id"], timedelta(minutes=5))
    expired = make_token(user["id"], timedelta(minutes=-5))

    # Controle: um token igual, mas ainda dentro da validade, é aceito.
    assert client.get("/api/users/me", headers=bearer(valid)).status_code == 200
    assert client.get("/api/users/me", headers=bearer(expired)).status_code == 401


def test_token_endpoint_returns_bearer_token(
    register_user: Callable[..., TestClient], client: TestClient
) -> None:
    user = register_user().user

    response = client.post(
        "/api/auth/token", data={"username": user["username"], "password": DEFAULT_PASSWORD}
    )

    assert response.status_code == 200
    token = response.json()
    assert token["token_type"] == "bearer"
    assert client.cookies.get(COOKIE) is None  # este fluxo não usa cookie
    me = client.get("/api/users/me", headers=bearer(token["access_token"]))
    assert me.status_code == 200
    assert me.json()["id"] == user["id"]


def test_token_endpoint_with_wrong_password_returns_401(
    register_user: Callable[..., TestClient], client: TestClient
) -> None:
    user = register_user().user

    response = client.post(
        "/api/auth/token", data={"username": user["username"], "password": "senha-errada"}
    )

    assert response.status_code == 401
