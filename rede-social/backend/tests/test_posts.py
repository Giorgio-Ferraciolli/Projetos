from collections.abc import Callable
from io import BytesIO
from typing import Any

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.core.config import settings
from app.services.image_service import MAX_DIMENSION, ImageKind
from app.storage import LocalStorage
from tests.conftest import create_community, create_post, image_bytes, png_file, stored_file

INVALID_IMAGE_MESSAGE = (
    "O arquivo enviado não é uma imagem válida. Envie uma imagem JPEG, PNG ou WEBP."
)


def feed(client: TestClient, **params: Any) -> dict[str, Any]:
    response = client.get("/api/posts/feed", params=params)
    assert response.status_code == 200, response.text
    return response.json()


def feed_ids(client: TestClient) -> list[int]:
    return [post["id"] for post in feed(client)["items"]]


def image_with_exif(image_format: str) -> bytes:
    exif = Image.Exif()
    exif[0x010F] = "Camera Secreta"  # tag "Make": fabricante da câmera
    output = BytesIO()
    Image.new("RGB", (64, 48), "orange").save(output, format=image_format, exif=exif)
    return output.getvalue()


# ---------- Criação ----------


def test_create_post_with_image_and_caption(auth_client: TestClient, storage: LocalStorage) -> None:
    response = auth_client.post(
        "/api/posts", data={"caption": "Pôr do sol"}, files={"image": png_file()}
    )

    assert response.status_code == 201
    post = response.json()
    assert post["caption"] == "Pôr do sol"
    assert post["author"]["id"] == auth_client.user["id"]
    assert post["community"] is None
    assert post["likes_count"] == 0
    assert post["liked_by_me"] is False
    assert post["can_delete"] is True
    assert post["image_url"].startswith("/media/posts/")
    assert stored_file(storage, post["image_url"]).is_file()


def test_create_post_with_caption_only(auth_client: TestClient) -> None:
    response = auth_client.post("/api/posts", data={"caption": "  Só texto  "})

    assert response.status_code == 201
    assert response.json()["caption"] == "Só texto"
    assert response.json()["image_url"] is None


@pytest.mark.parametrize("data", [{}, {"caption": ""}, {"caption": "   "}])
def test_create_post_without_image_or_caption_returns_400(
    auth_client: TestClient, data: dict[str, str]
) -> None:
    response = auth_client.post("/api/posts", data=data)

    assert response.status_code == 400
    assert response.json()["detail"] == "A publicação precisa de uma imagem ou de uma legenda."


def test_create_post_with_non_image_file_returns_400(auth_client: TestClient) -> None:
    fake_image = ("foto.png", b"isto nao e uma imagem", "image/png")

    response = auth_client.post("/api/posts", files={"image": fake_image})

    assert response.status_code == 400
    assert response.json()["detail"] == INVALID_IMAGE_MESSAGE


def test_create_post_with_unsupported_format_returns_400(auth_client: TestClient) -> None:
    gif = ("animacao.gif", image_bytes("GIF"), "image/gif")

    response = auth_client.post("/api/posts", files={"image": gif})

    # Formatos fora da lista (GIF, BMP, TIFF...) são recusados antes de serem decodificados.
    assert response.status_code == 400
    assert response.json()["detail"] == INVALID_IMAGE_MESSAGE


def test_create_post_with_too_large_file_returns_413(
    auth_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "max_upload_size_mb", 1)
    too_large = ("grande.png", b"0" * (settings.max_upload_size_bytes + 1), "image/png")

    response = auth_client.post("/api/posts", files={"image": too_large})

    assert response.status_code == 413
    assert response.json()["detail"] == "A imagem deve ter no máximo 1 MB."


@pytest.mark.parametrize("image_format", ["JPEG", "PNG", "WEBP"])
def test_saved_image_has_no_exif_metadata(
    auth_client: TestClient, storage: LocalStorage, image_format: str
) -> None:
    extension = image_format.lower()
    original = image_with_exif(image_format)
    with Image.open(BytesIO(original)) as image:
        assert image.getexif()  # pré-condição: o arquivo enviado tem EXIF

    response = auth_client.post(
        "/api/posts", files={"image": (f"foto.{extension}", original, f"image/{extension}")}
    )

    with Image.open(stored_file(storage, response.json()["image_url"])) as saved:
        assert saved.format == image_format
        assert not saved.getexif()


def test_image_with_huge_dimensions_is_rejected_before_decoding(
    auth_client: TestClient,
) -> None:
    # Um PNG de poucos KB pode declarar dimensões enormes ("decompression bomb").
    output = BytesIO()
    Image.new("1", (8000, 8000)).save(output, format="PNG")

    response = auth_client.post(
        "/api/posts", files={"image": ("bomb.png", output.getvalue(), "image/png")}
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "A imagem tem dimensões grandes demais."


def test_large_image_is_downscaled(auth_client: TestClient, storage: LocalStorage) -> None:
    max_side = MAX_DIMENSION[ImageKind.POST]

    response = auth_client.post(
        "/api/posts", files={"image": png_file(size=(max_side * 2, max_side))}
    )

    with Image.open(stored_file(storage, response.json()["image_url"])) as saved:
        assert saved.size == (max_side, max_side // 2)  # mantém a proporção


# ---------- Feed e listagens ----------


def test_feed_shows_posts_from_everyone_newest_first(
    register_user: Callable[..., TestClient],
) -> None:
    ana = register_user()
    bruno = register_user()
    create_post(ana, caption="primeiro")
    create_post(bruno, caption="segundo")
    create_post(ana, caption="terceiro")

    page = feed(ana)

    assert [post["caption"] for post in page["items"]] == ["terceiro", "segundo", "primeiro"]
    assert page["next_cursor"] is None


def test_feed_cursor_pagination(auth_client: TestClient) -> None:
    created_ids = [create_post(auth_client, caption=f"post {n}")["id"] for n in range(5)]

    first = feed(auth_client, limit=2)
    second = feed(auth_client, limit=2, cursor=first["next_cursor"])
    third = feed(auth_client, limit=2, cursor=second["next_cursor"])

    pages = [first, second, third]
    assert [len(page["items"]) for page in pages] == [2, 2, 1]
    # Todos os posts, sem repetição, do mais novo para o mais antigo.
    seen_ids = [post["id"] for page in pages for post in page["items"]]
    assert seen_ids == sorted(created_ids, reverse=True)
    assert first["next_cursor"] == first["items"][-1]["id"]
    assert third["next_cursor"] is None


def test_feed_cursor_ignores_posts_created_after_first_page(auth_client: TestClient) -> None:
    for n in range(3):
        create_post(auth_client, caption=f"post {n}")
    first = feed(auth_client, limit=2)

    create_post(auth_client, caption="publicado enquanto a pessoa lia")
    second = feed(auth_client, limit=2, cursor=first["next_cursor"])

    # Com offset, o post novo empurraria um item já visto para a segunda página.
    assert [post["caption"] for post in second["items"]] == ["post 0"]


def test_profile_posts_lists_only_that_users_posts(
    register_user: Callable[..., TestClient],
) -> None:
    author = register_user()
    other = register_user()
    create_post(author, caption="do autor")
    create_post(other, caption="de outra pessoa")

    response = other.get(f"/api/users/{author.user['username']}/posts")

    assert response.status_code == 200
    assert [post["caption"] for post in response.json()["items"]] == ["do autor"]
    assert response.json()["next_cursor"] is None


# ---------- Exclusão ----------


def test_author_can_delete_own_post(auth_client: TestClient, storage: LocalStorage) -> None:
    post = auth_client.post("/api/posts", files={"image": png_file()}).json()
    image_path = stored_file(storage, post["image_url"])

    response = auth_client.delete(f"/api/posts/{post['id']}")

    assert response.status_code == 204
    assert auth_client.get(f"/api/posts/{post['id']}").status_code == 404
    assert not image_path.exists()


def test_cannot_delete_someone_elses_post(register_user: Callable[..., TestClient]) -> None:
    author = register_user()
    intruder = register_user()
    post = create_post(author)

    response = intruder.delete(f"/api/posts/{post['id']}")

    assert response.status_code == 403
    assert author.get(f"/api/posts/{post['id']}").status_code == 200


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("GET", "/api/posts/999999"),
        ("DELETE", "/api/posts/999999"),
        ("PUT", "/api/posts/999999/like"),
    ],
)
def test_missing_post_returns_404(auth_client: TestClient, method: str, path: str) -> None:
    response = auth_client.request(method, path)

    assert response.status_code == 404
    assert response.json()["detail"] == "Publicação não encontrada."


# ---------- Curtidas ----------


def test_like_is_idempotent(register_user: Callable[..., TestClient]) -> None:
    author = register_user()
    fan = register_user()
    post = create_post(author)

    fan.put(f"/api/posts/{post['id']}/like")
    response = fan.put(f"/api/posts/{post['id']}/like")

    assert response.status_code == 200
    assert response.json() == {"likes_count": 1, "liked_by_me": True}
    seen_by_author = author.get(f"/api/posts/{post['id']}").json()
    assert seen_by_author["likes_count"] == 1
    assert seen_by_author["liked_by_me"] is False


def test_unlike_is_idempotent(register_user: Callable[..., TestClient]) -> None:
    author = register_user()
    fan = register_user()
    post = create_post(author)
    fan.put(f"/api/posts/{post['id']}/like")

    fan.delete(f"/api/posts/{post['id']}/like")
    response = fan.delete(f"/api/posts/{post['id']}/like")

    assert response.status_code == 200
    assert response.json() == {"likes_count": 0, "liked_by_me": False}


# ---------- Posts em comunidades ----------


def test_posting_in_community_requires_membership(
    register_user: Callable[..., TestClient],
) -> None:
    owner = register_user()
    outsider = register_user()
    community = create_community(owner)

    response = outsider.post("/api/posts", data={"caption": "Oi!", "community_id": community["id"]})

    assert response.status_code == 403
    assert response.json()["detail"] == "Você precisa participar da comunidade para publicar nela."


def test_member_can_post_in_community(register_user: Callable[..., TestClient]) -> None:
    owner = register_user()
    member = register_user()
    community = create_community(owner)
    member.put(f"/api/communities/{community['id']}/membership")

    response = member.post(
        "/api/posts", data={"caption": "Oi, pessoal!", "community_id": community["id"]}
    )

    assert response.status_code == 201
    post = response.json()
    assert post["community"] == {"id": community["id"], "name": community["name"]}
    community_posts = member.get(f"/api/communities/{community['id']}/posts").json()
    assert [item["id"] for item in community_posts["items"]] == [post["id"]]


def test_posting_in_missing_community_returns_404(auth_client: TestClient) -> None:
    response = auth_client.post("/api/posts", data={"caption": "Oi!", "community_id": 999999})

    assert response.status_code == 404


def test_community_owner_can_delete_members_posts(
    register_user: Callable[..., TestClient],
) -> None:
    owner = register_user()
    member = register_user()
    stranger = register_user()
    community = create_community(owner)
    member.put(f"/api/communities/{community['id']}/membership")
    post = create_post(member, community_id=community["id"])

    seen_by_owner = owner.get(f"/api/posts/{post['id']}").json()
    seen_by_stranger = stranger.get(f"/api/posts/{post['id']}").json()
    response = owner.delete(f"/api/posts/{post['id']}")

    assert seen_by_owner["can_delete"] is True
    assert seen_by_stranger["can_delete"] is False
    assert response.status_code == 204
    assert member.get(f"/api/posts/{post['id']}").status_code == 404


def test_feed_includes_community_posts_only_for_members(
    register_user: Callable[..., TestClient],
) -> None:
    owner = register_user()
    outsider = register_user()
    community = create_community(owner)
    post = create_post(owner, caption="Só para membros", community_id=community["id"])

    owner_feed = feed_ids(owner)
    outsider_feed_before_joining = feed_ids(outsider)
    outsider.put(f"/api/communities/{community['id']}/membership")
    outsider_feed_after_joining = feed_ids(outsider)

    assert post["id"] in owner_feed
    assert post["id"] not in outsider_feed_before_joining
    assert post["id"] in outsider_feed_after_joining
