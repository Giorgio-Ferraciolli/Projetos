from collections.abc import Callable

from fastapi.testclient import TestClient

from app.storage import LocalStorage
from tests.conftest import create_community, png_file, stored_file

# ---------- Criação ----------


def test_create_community_makes_creator_owner_and_member(auth_client: TestClient) -> None:
    response = auth_client.post(
        "/api/communities", data={"name": "Fotografia", "description": "Fotos e técnicas."}
    )

    assert response.status_code == 201
    community = response.json()
    assert community["name"] == "Fotografia"
    assert community["owner"]["id"] == auth_client.user["id"]
    assert community["is_owner"] is True
    assert community["is_member"] is True
    assert community["members_count"] == 1
    assert community["posts_count"] == 0
    assert community["cover_url"] is None


def test_create_community_with_cover(auth_client: TestClient, storage: LocalStorage) -> None:
    response = auth_client.post(
        "/api/communities",
        data={"name": "Trilhas", "description": "Caminhadas no fim de semana."},
        files={"cover": png_file()},
    )

    assert response.status_code == 201
    cover_url = response.json()["cover_url"]
    assert cover_url.startswith("/media/covers/")
    assert stored_file(storage, cover_url).is_file()


def test_community_name_must_be_unique_ignoring_case(
    register_user: Callable[..., TestClient],
) -> None:
    create_community(register_user(), name="Fotografia")

    response = register_user().post(
        "/api/communities", data={"name": "FOTOGRAFIA", "description": "Outra descrição."}
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "Já existe uma comunidade com esse nome."


def test_create_community_with_short_name_returns_422(auth_client: TestClient) -> None:
    response = auth_client.post("/api/communities", data={"name": "ab", "description": "Curto."})

    assert response.status_code == 422
    assert [error["field"] for error in response.json()["errors"]] == ["name"]


# ---------- Listagem e detalhes ----------


def test_list_communities_with_search(auth_client: TestClient) -> None:
    create_community(auth_client, name="Culinária Vegana")
    create_community(auth_client, name="Fotografia Analógica")

    response = auth_client.get("/api/communities", params={"q": "foto"})

    assert response.status_code == 200
    page = response.json()
    assert [community["name"] for community in page["items"]] == ["Fotografia Analógica"]
    assert page["total"] == 1


def test_list_only_my_communities(register_user: Callable[..., TestClient]) -> None:
    other = register_user()
    me = register_user()
    joined = create_community(other, name="Corrida")
    create_community(other, name="Xadrez")
    create_community(me, name="Jardinagem")
    me.put(f"/api/communities/{joined['id']}/membership")

    response = me.get("/api/communities", params={"mine": True})

    items = response.json()["items"]
    assert [community["name"] for community in items] == ["Corrida", "Jardinagem"]
    assert all(community["is_member"] for community in items)


def test_get_missing_community_returns_404(auth_client: TestClient) -> None:
    response = auth_client.get("/api/communities/999999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Comunidade não encontrada."


# ---------- Participação ----------


def test_join_community_is_idempotent(register_user: Callable[..., TestClient]) -> None:
    owner = register_user()
    member = register_user()
    community = create_community(owner)

    member.put(f"/api/communities/{community['id']}/membership")
    response = member.put(f"/api/communities/{community['id']}/membership")

    assert response.status_code == 200
    assert response.json()["is_member"] is True
    assert response.json()["is_owner"] is False
    assert response.json()["members_count"] == 2


def test_leave_community(register_user: Callable[..., TestClient]) -> None:
    owner = register_user()
    member = register_user()
    community = create_community(owner)
    member.put(f"/api/communities/{community['id']}/membership")

    response = member.delete(f"/api/communities/{community['id']}/membership")

    assert response.status_code == 200
    assert response.json()["is_member"] is False
    assert response.json()["members_count"] == 1


def test_owner_cannot_leave_own_community(auth_client: TestClient) -> None:
    community = create_community(auth_client)

    response = auth_client.delete(f"/api/communities/{community['id']}/membership")

    assert response.status_code == 400
    assert response.json()["detail"] == "O dono não pode sair da própria comunidade."


def test_members_list_shows_owner_first(register_user: Callable[..., TestClient]) -> None:
    owner = register_user()
    first_member = register_user()
    second_member = register_user()
    community = create_community(owner)
    first_member.put(f"/api/communities/{community['id']}/membership")
    second_member.put(f"/api/communities/{community['id']}/membership")

    response = second_member.get(f"/api/communities/{community['id']}/members")

    assert response.status_code == 200
    page = response.json()
    owner_entry, *member_entries = page["items"]
    assert owner_entry["user"]["id"] == owner.user["id"]
    assert owner_entry["role"] == "owner"
    assert {entry["user"]["id"] for entry in member_entries} == {
        first_member.user["id"],
        second_member.user["id"],
    }
    assert {entry["role"] for entry in member_entries} == {"member"}
    assert page["total"] == 3


# ---------- Edição (apenas o dono) ----------


def test_owner_can_update_community(auth_client: TestClient) -> None:
    community = create_community(auth_client, name="Leitura")

    response = auth_client.patch(
        f"/api/communities/{community['id']}", json={"description": "Clube do livro mensal."}
    )

    assert response.status_code == 200
    assert response.json()["description"] == "Clube do livro mensal."
    assert response.json()["name"] == "Leitura"


def test_non_owner_cannot_update_community(register_user: Callable[..., TestClient]) -> None:
    community = create_community(register_user())
    member = register_user()
    member.put(f"/api/communities/{community['id']}/membership")

    response = member.patch(f"/api/communities/{community['id']}", json={"name": "Invadida"})

    assert response.status_code == 403
    assert response.json()["detail"] == "Apenas o dono da comunidade pode fazer isso."


def test_owner_can_replace_cover(auth_client: TestClient, storage: LocalStorage) -> None:
    community = auth_client.post(
        "/api/communities",
        data={"name": "Ciclismo", "description": "Pedais em grupo."},
        files={"cover": png_file(color="red")},
    ).json()

    response = auth_client.put(
        f"/api/communities/{community['id']}/cover", files={"file": png_file(color="blue")}
    )

    assert response.status_code == 200
    new_cover_url = response.json()["cover_url"]
    assert new_cover_url != community["cover_url"]
    assert stored_file(storage, new_cover_url).is_file()
    assert not stored_file(storage, community["cover_url"]).exists()


def test_non_owner_cannot_change_cover(register_user: Callable[..., TestClient]) -> None:
    community = create_community(register_user())
    other = register_user()

    response = other.put(f"/api/communities/{community['id']}/cover", files={"file": png_file()})

    assert response.status_code == 403


def test_owner_can_fix_accents_in_community_name(auth_client: TestClient) -> None:
    # Para o MySQL (collation *_ai_ci), "Culinaria" e "Culinária" são o mesmo nome.
    community = create_community(auth_client, name="Culinaria")

    response = auth_client.patch(f"/api/communities/{community['id']}", json={"name": "Culinária"})

    assert response.status_code == 200
    assert response.json()["name"] == "Culinária"
