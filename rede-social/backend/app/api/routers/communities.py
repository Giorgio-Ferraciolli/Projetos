from typing import Annotated

from fastapi import APIRouter, File, Form, Query, UploadFile, status

from app.api.deps import (
    CurrentUser,
    Cursor,
    DbSession,
    Limit,
    Offset,
    SearchQuery,
    StorageDep,
    read_optional_image,
)
from app.schemas.common import CursorPage, Page
from app.schemas.community import (
    CommunityDescription,
    CommunityDetail,
    CommunityMemberOut,
    CommunityName,
    CommunitySummary,
    CommunityUpdate,
)
from app.schemas.post import PostOut
from app.services import community_service, post_service
from app.services.image_service import read_upload

router = APIRouter(prefix="/communities", tags=["communities"])


@router.get("", response_model=Page[CommunitySummary])
def list_communities(
    current_user: CurrentUser,
    db: DbSession,
    q: SearchQuery = None,
    mine: Annotated[bool, Query(description="Somente comunidades das quais participo")] = False,
    limit: Limit = 20,
    offset: Offset = 0,
) -> Page[CommunitySummary]:
    items, total = community_service.list_communities(db, current_user, q, mine, limit, offset)
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.post("", response_model=CommunityDetail, status_code=status.HTTP_201_CREATED)
def create_community(
    current_user: CurrentUser,
    db: DbSession,
    storage: StorageDep,
    # Campos declarados um a um (e não como modelo Pydantic) porque há também um File().
    name: Annotated[CommunityName, Form()],
    description: Annotated[CommunityDescription, Form()],
    cover: Annotated[
        UploadFile | None, File(description="Capa opcional (JPEG, PNG ou WEBP)")
    ] = None,
) -> CommunityDetail:
    """Cria uma comunidade (multipart/form-data). O criador vira dono e membro."""
    community = community_service.create_community(
        db,
        storage,
        owner=current_user,
        name=name,
        description=description,
        cover_data=read_optional_image(cover),
    )
    return community_service.to_detail(db, community, current_user)


@router.get("/{community_id}", response_model=CommunityDetail)
def get_community(community_id: int, current_user: CurrentUser, db: DbSession) -> CommunityDetail:
    community = community_service.get_community(db, community_id)
    return community_service.to_detail(db, community, current_user)


@router.patch("/{community_id}", response_model=CommunityDetail)
def update_community(
    community_id: int, data: CommunityUpdate, current_user: CurrentUser, db: DbSession
) -> CommunityDetail:
    """Edita nome e/ou descrição. Apenas o dono."""
    community = community_service.get_community(db, community_id)
    community = community_service.update_community(db, community, current_user, data)
    return community_service.to_detail(db, community, current_user)


@router.put("/{community_id}/cover", response_model=CommunityDetail)
def update_community_cover(
    community_id: int,
    current_user: CurrentUser,
    db: DbSession,
    storage: StorageDep,
    file: UploadFile = File(description="Imagem JPEG, PNG ou WEBP"),
) -> CommunityDetail:
    """Troca a capa da comunidade. Apenas o dono."""
    community = community_service.get_community(db, community_id)
    community = community_service.update_cover(
        db, storage, community, current_user, read_upload(file.file)
    )
    return community_service.to_detail(db, community, current_user)


@router.put("/{community_id}/membership", response_model=CommunityDetail)
def join_community(community_id: int, current_user: CurrentUser, db: DbSession) -> CommunityDetail:
    """Entrar na comunidade (idempotente)."""
    community = community_service.get_community(db, community_id)
    community_service.join(db, community, current_user)
    return community_service.to_detail(db, community, current_user)


@router.delete("/{community_id}/membership", response_model=CommunityDetail)
def leave_community(community_id: int, current_user: CurrentUser, db: DbSession) -> CommunityDetail:
    """Sair da comunidade. O dono não pode sair."""
    community = community_service.get_community(db, community_id)
    community_service.leave(db, community, current_user)
    return community_service.to_detail(db, community, current_user)


@router.get("/{community_id}/members", response_model=Page[CommunityMemberOut])
def list_members(
    community_id: int,
    _: CurrentUser,
    db: DbSession,
    limit: Limit = 20,
    offset: Offset = 0,
) -> Page[CommunityMemberOut]:
    community = community_service.get_community(db, community_id)
    members, total = community_service.list_members(db, community, limit, offset)
    return Page(items=members, total=total, limit=limit, offset=offset)


@router.get("/{community_id}/posts", response_model=CursorPage[PostOut])
def list_community_posts(
    community_id: int,
    current_user: CurrentUser,
    db: DbSession,
    cursor: Cursor = None,
    limit: Limit = 10,
) -> CursorPage[PostOut]:
    community = community_service.get_community(db, community_id)
    return post_service.list_community_posts(db, current_user, community, cursor, limit)
