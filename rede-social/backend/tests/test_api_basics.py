"""Comportamentos gerais da API: validação de paginação, erros inesperados e limites."""

import pytest
from fastapi.testclient import TestClient
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import PlainTextResponse
from starlette.routing import Route

from app.core.body_limit import BodySizeLimitMiddleware
from app.services import user_service


def test_offset_above_limit_returns_422(auth_client: TestClient) -> None:
    response = auth_client.get("/api/users", params={"offset": 10_001})

    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "offset"


def test_unexpected_error_returns_generic_500_with_request_id(
    auth_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def broken_search(*args: object, **kwargs: object) -> None:
        raise RuntimeError("falha interna com detalhes sensíveis")

    monkeypatch.setattr(user_service, "search_users", broken_search)

    response = auth_client.get("/api/users")

    assert response.status_code == 500
    assert response.json() == {"detail": "Erro interno. Tente novamente mais tarde."}
    assert "sensíveis" not in response.text
    assert response.headers["X-Request-ID"]


def _echo_app(max_body_size: int) -> TestClient:
    async def echo(request: Request) -> PlainTextResponse:
        return PlainTextResponse(str(len(await request.body())))

    app = Starlette(routes=[Route("/", echo, methods=["POST"])])
    app.add_middleware(BodySizeLimitMiddleware, max_body_size=max_body_size)
    return TestClient(app)


def test_body_size_limit_rejects_large_requests() -> None:
    client = _echo_app(max_body_size=10)

    assert client.post("/", content=b"x" * 10).status_code == 200
    response = client.post("/", content=b"x" * 11)
    assert response.status_code == 413
    assert response.json()["detail"] == "A requisição é grande demais."
