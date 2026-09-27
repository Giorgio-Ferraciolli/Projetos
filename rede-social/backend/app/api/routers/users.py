from fastapi import APIRouter, File, UploadFile, status

from app.api.deps import (
    CurrentUser,
    Cursor,
    DbSession,
    Limit,
    Offset,
    SearchQuery,
    StorageDep,
)
from app.schemas.common import CursorPage, Page
from app.schemas.post import PostOut
from app.schemas.user import (
    PasswordChange,
    ProfileUpdate,
    UserPrivate,
    UserProfile,
    UserSummary,
)
from app.services import post_service, user_service
from app.services.image_service import read_upload

router = APIRouter(prefix="/users", tags=["users"])


# ---------- Usuário logado ----------
# As rotas /me precisam vir antes de /{username} para não serem confundidas com um username.


@router.get("/me", response_model=UserPrivate)
def get_me(current_user: CurrentUser) -> UserPrivate:
    """Dados do usuário logado, incluindo e-mail e data de nascimento."""
    return UserPrivate.from_user(current_user)


@router.patch("/me", response_model=UserPrivate)
def update_me(data: ProfileUpdate, current_user: CurrentUser, db: DbSession) -> UserPrivate:
    user = user_service.update_profile(db, current_user, data)
    return UserPrivate.from_user(user)


@router.put("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_my_password(data: PasswordChange, current_user: CurrentUser, db: DbSession) -> None:
    user_service.change_password(db, current_user, data)


@router.put("/me/avatar", response_model=UserPrivate)
def upload_my_avatar(
    current_user: CurrentUser,
    db: DbSession,
    storage: StorageDep,
    file: UploadFile = File(description="Imagem JPEG, PNG ou WEBP"),
) -> UserPrivate:
    user = user_service.update_avatar(db, storage, current_user, read_upload(file.file))
    return UserPrivate.from_user(user)


@router.delete("/me/avatar", response_model=UserPrivate)
def remove_my_avatar(current_user: CurrentUser, db: DbSession, storage: StorageDep) -> UserPrivate:
    user = user_service.remove_avatar(db, storage, current_user)
    return UserPrivate.from_user(user)


# ---------- Outros usuários ----------


@router.get("", response_model=Page[UserSummary])
def list_users(
    _: CurrentUser,
    db: DbSession,
    q: SearchQuery = None,
    limit: Limit = 20,
    offset: Offset = 0,
) -> Page[UserSummary]:
    """Explorar usuários, com busca opcional por nome ou username."""
    users, total = user_service.search_users(db, q, limit, offset)
    items = [UserSummary.from_user(user) for user in users]
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.get("/{username}", response_model=UserProfile)
def get_profile(username: str, _: CurrentUser, db: DbSession) -> UserProfile:
    user = user_service.get_by_username(db, username)
    posts_count, communities_count = user_service.get_profile_stats(db, user)
    return UserProfile.from_user_with_stats(user, posts_count, communities_count)


@router.get("/{username}/posts", response_model=CursorPage[PostOut])
def list_profile_posts(
    username: str,
    current_user: CurrentUser,
    db: DbSession,
    cursor: Cursor = None,
    limit: Limit = 10,
) -> CursorPage[PostOut]:
    author = user_service.get_by_username(db, username)
    return post_service.list_user_posts(db, current_user, author, cursor, limit)
