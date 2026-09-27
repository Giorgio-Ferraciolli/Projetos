from collections.abc import Callable

from fastapi.testclient import TestClient

from app.storage import LocalStorage
from tests.conftest import (
    DEFAULT_PASSWORD,
    create_community,
    create_post,
    png_file,
    stored_file,
)

# ---------- Perfis ----------


def test_get_me_returns_private_data(auth_client: TestClient) -> None:
    response = auth_client.get("/api/users/me")

    assert response.status_code == 200
    me = response.json()
    assert me["id"] == auth_client.user["id"]
    assert me["email"] == auth_client.user["email"]
    assert me["birth_date"] == "1995-05-20"
    assert "password_hash" not in me


def test_other_user_profile_hides_private_data_and_shows_stats(
    register_user: Callable[..., TestClient],
) -> None:
    viewer = register_user()
    author = register_user()
    create_post(author)
    create_community(author)

    response = viewer.get(f"/api/users/{author.user['username']}")

    assert response.status_code == 200
    profile = response.json()
    assert profile["username"] == author.user["username"]
    assert "email" not in profile
    assert "birth_date" not in profile
    assert profile["age"] == author.user["age"]
    assert profile["posts_count"] == 1
    assert profile["communities_count"] == 1


def test_unknown_profile_returns_404(auth_client: TestClient) -> None:
    response = auth_client.get("/api/users/ninguem")

    assert response.status_code == 404
    assert response.json()["detail"] == "Usuário não encontrado."


# ---------- Busca ----------


def test_search_users_by_name_or_username(register_user: Callable[..., TestClient]) -> None:
    searcher = register_user()
    register_user(name="Mariana Souza", username="mari")
    register_user(name="Pedro Alves", username="pedro_mariano")
    register_user(name="Carlos Lima", username="carlos")

    response = searcher.get("/api/users", params={"q": "mari"})

    assert response.status_code == 200
    page = response.json()
    # "Mariana" casa pelo nome e "pedro_mariano" pelo username; resultado ordenado por nome.
    assert [user["name"] for user in page["items"]] == ["Mariana Souza", "Pedro Alves"]
    assert page["total"] == 2
    assert "email" not in page["items"][0]


def test_search_treats_percent_sign_literally(register_user: Callable[..., TestClient]) -> None:
    searcher = register_user()
    register_user(name="Promoção 100% Real")

    response = searcher.get("/api/users", params={"q": "%"})

    # Se "%" fosse curinga do LIKE, todos os usuários seriam encontrados.
    assert [user["name"] for user in response.json()["items"]] == ["Promoção 100% Real"]


# ---------- Edição do perfil ----------


def test_update_profile_changes_name_and_bio(auth_client: TestClient) -> None:
    response = auth_client.patch("/api/users/me", json={"name": "Nome Novo", "bio": "Bio nova"})

    assert response.status_code == 200
    assert response.json()["name"] == "Nome Novo"
    assert response.json()["bio"] == "Bio nova"
    assert auth_client.get("/api/users/me").json()["name"] == "Nome Novo"


def test_update_profile_with_empty_bio_clears_it(auth_client: TestClient) -> None:
    response = auth_client.patch("/api/users/me", json={"bio": ""})

    assert response.status_code == 200
    assert response.json()["bio"] is None


def test_update_profile_with_null_name_keeps_current_name(auth_client: TestClient) -> None:
    response = auth_client.patch("/api/users/me", json={"name": None, "bio": "Só a bio"})

    assert response.status_code == 200
    assert response.json()["name"] == auth_client.user["name"]
    assert response.json()["bio"] == "Só a bio"


def test_update_profile_with_taken_username_returns_409(
    register_user: Callable[..., TestClient],
) -> None:
    other = register_user()
    me = register_user()

    response = me.patch("/api/users/me", json={"username": other.user["username"].upper()})

    assert response.status_code == 409
    assert response.json()["detail"] == "Este nome de usuário já está em uso."
    # O campo com problema é informado para o frontend destacá-lo no formulário.
    assert response.json()["errors"][0]["field"] == "username"


def test_update_profile_keeping_own_username_and_email_is_allowed(auth_client: TestClient) -> None:
    response = auth_client.patch(
        "/api/users/me",
        json={"username": auth_client.user["username"], "email": auth_client.user["email"]},
    )

    assert response.status_code == 200


# ---------- Senha ----------


def test_change_password_with_wrong_current_password_returns_400_and_keeps_session(
    auth_client: TestClient,
) -> None:
    response = auth_client.put(
        "/api/users/me/password",
        json={"current_password": "senha-errada", "new_password": "nova-senha-123"},
    )

    # 400 com erro no campo (e não 401): a sessão continua válida.
    assert response.status_code == 400
    assert response.json()["detail"] == "A senha atual está incorreta."
    assert response.json()["errors"] == [
        {"field": "current_password", "message": "A senha atual está incorreta."}
    ]
    assert auth_client.get("/api/users/me").status_code == 200


def test_change_password_allows_login_with_new_password(
    auth_client: TestClient, client: TestClient
) -> None:
    username = auth_client.user["username"]

    response = auth_client.put(
        "/api/users/me/password",
        json={"current_password": DEFAULT_PASSWORD, "new_password": "nova-senha-123"},
    )

    assert response.status_code == 204
    new_login = client.post(
        "/api/auth/login", json={"login": username, "password": "nova-senha-123"}
    )
    old_login = client.post(
        "/api/auth/login", json={"login": username, "password": DEFAULT_PASSWORD}
    )
    assert new_login.status_code == 200
    assert old_login.status_code == 401


# ---------- Avatar ----------


def test_upload_avatar_saves_image(auth_client: TestClient, storage: LocalStorage) -> None:
    response = auth_client.put("/api/users/me/avatar", files={"file": png_file()})

    assert response.status_code == 200
    avatar_url = response.json()["avatar_url"]
    assert avatar_url.startswith("/media/avatars/")
    assert stored_file(storage, avatar_url).is_file()


def test_replacing_avatar_deletes_old_file(auth_client: TestClient, storage: LocalStorage) -> None:
    first = auth_client.put("/api/users/me/avatar", files={"file": png_file(color="red")})
    first_url = first.json()["avatar_url"]

    second = auth_client.put("/api/users/me/avatar", files={"file": png_file(color="blue")})

    second_url = second.json()["avatar_url"]
    assert second_url != first_url
    assert stored_file(storage, second_url).is_file()
    assert not stored_file(storage, first_url).exists()


def test_remove_avatar_clears_it_and_deletes_file(
    auth_client: TestClient, storage: LocalStorage
) -> None:
    upload = auth_client.put("/api/users/me/avatar", files={"file": png_file()})
    avatar_url = upload.json()["avatar_url"]

    response = auth_client.delete("/api/users/me/avatar")

    assert response.status_code == 200
    assert response.json()["avatar_url"] is None
    assert not stored_file(storage, avatar_url).exists()
