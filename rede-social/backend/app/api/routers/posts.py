from typing import Annotated

from fastapi import APIRouter, File, Form, UploadFile, status

from app.api.deps import CurrentUser, Cursor, DbSession, Limit, StorageDep, read_optional_image
from app.schemas.common import CursorPage
from app.schemas.post import Caption, LikeStatus, PostOut
from app.services import post_service

router = APIRouter(prefix="/posts", tags=["posts"])


@router.get("/feed", response_model=CursorPage[PostOut])
def get_feed(
    current_user: CurrentUser, db: DbSession, cursor: Cursor = None, limit: Limit = 10
) -> CursorPage[PostOut]:
    """Posts de perfil de todos os usuários e posts das comunidades das quais você participa."""
    return post_service.list_feed(db, current_user, cursor, limit)


@router.post("", response_model=PostOut, status_code=status.HTTP_201_CREATED)
def create_post(
    current_user: CurrentUser,
    db: DbSession,
    storage: StorageDep,
    # Campos declarados um a um: um modelo Pydantic com Form() só funciona quando é o
    # único campo do corpo; junto com File(), o FastAPI esperaria um campo "form".
    caption: Annotated[Caption, Form()] = None,
    community_id: Annotated[int | None, Form(ge=1)] = None,
    image: Annotated[UploadFile | None, File(description="Imagem JPEG, PNG ou WEBP")] = None,
) -> PostOut:
    """Cria uma publicação (multipart/form-data). Exige imagem, legenda ou ambos.
    Informe `community_id` para publicar dentro de uma comunidade."""
    post = post_service.create_post(
        db,
        storage,
        author=current_user,
        caption=caption,
        community_id=community_id,
        image_data=read_optional_image(image),
    )
    [view] = post_service.to_post_views(db, [post], current_user)
    return view


@router.get("/{post_id}", response_model=PostOut)
def get_post(post_id: int, current_user: CurrentUser, db: DbSession) -> PostOut:
    post = post_service.get_post(db, post_id)
    [view] = post_service.to_post_views(db, [post], current_user)
    return view


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int, current_user: CurrentUser, db: DbSession, storage: StorageDep
) -> None:
    post = post_service.get_post(db, post_id)
    post_service.delete_post(db, storage, post, current_user)


@router.put("/{post_id}/like", response_model=LikeStatus)
def like_post(post_id: int, current_user: CurrentUser, db: DbSession) -> LikeStatus:
    post = post_service.get_post(db, post_id)
    return post_service.like_post(db, post, current_user)


@router.delete("/{post_id}/like", response_model=LikeStatus)
def unlike_post(post_id: int, current_user: CurrentUser, db: DbSession) -> LikeStatus:
    post = post_service.get_post(db, post_id)
    return post_service.unlike_post(db, post, current_user)
