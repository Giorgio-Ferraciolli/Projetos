"""Regras de negócio de comunidades e participação (membros)."""

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import (
    ConflictError,
    InvalidInputError,
    NotFoundError,
    PermissionDeniedError,
)
from app.models import Community, CommunityMember, Post, User
from app.schemas.community import (
    CommunityDetail,
    CommunityMemberOut,
    CommunitySummary,
    CommunityUpdate,
)
from app.schemas.user import UserSummary
from app.services.image_service import ImageKind, save_image
from app.storage import Storage, public_url

NAME_TAKEN = "Já existe uma comunidade com esse nome."


def create_community(
    db: Session,
    storage: Storage,
    owner: User,
    name: str,
    description: str,
    cover_data: bytes | None,
) -> Community:
    _ensure_name_available(db, name)
    cover_key = save_image(storage, cover_data, ImageKind.COVER) if cover_data else None

    community = Community(name=name, description=description, cover_key=cover_key, owner=owner)
    # Quem cria a comunidade também é membro dela.
    db.add_all([community, CommunityMember(community=community, user=owner)])
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        if cover_key:
            storage.delete(cover_key)
        if isinstance(exc, IntegrityError):
            raise ConflictError(NAME_TAKEN, field="name") from exc
        raise
    return community


def get_community(db: Session, community_id: int) -> Community:
    community = db.get(Community, community_id)
    if community is None:
        raise NotFoundError("Comunidade não encontrada.")
    return community


def is_member(db: Session, community_id: int, user_id: int) -> bool:
    return db.get(CommunityMember, (community_id, user_id)) is not None


def list_communities(
    db: Session,
    viewer: User,
    query: str | None,
    only_mine: bool,
    limit: int,
    offset: int,
) -> tuple[list[CommunitySummary], int]:
    statement = select(Community)
    if query:
        statement = statement.where(Community.name.contains(query, autoescape=True))
    if only_mine:
        statement = statement.join(CommunityMember).where(CommunityMember.user_id == viewer.id)

    total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0
    communities = db.scalars(
        statement.order_by(Community.name, Community.id).limit(limit).offset(offset)
    ).all()
    return to_summaries(db, list(communities), viewer), total


def to_summaries(db: Session, communities: list[Community], viewer: User) -> list[CommunitySummary]:
    """Monta as respostas buscando contagens e participação em lote (evita N+1 queries)."""
    ids = [community.id for community in communities]
    members_count = _members_count_by_community(db, ids)
    viewer_communities = _communities_of_user(db, ids, viewer.id)
    return [
        CommunitySummary(
            id=community.id,
            name=community.name,
            description=community.description,
            cover_url=public_url(community.cover_key),
            members_count=members_count.get(community.id, 0),
            is_member=community.id in viewer_communities,
        )
        for community in communities
    ]


def to_detail(db: Session, community: Community, viewer: User) -> CommunityDetail:
    [summary] = to_summaries(db, [community], viewer)
    posts_count = db.scalar(select(func.count()).where(Post.community_id == community.id)) or 0
    return CommunityDetail(
        **summary.model_dump(),
        owner=UserSummary.from_user(community.owner),
        posts_count=posts_count,
        is_owner=community.owner_id == viewer.id,
        created_at=community.created_at,
    )


def update_community(
    db: Session, community: Community, actor: User, data: CommunityUpdate
) -> Community:
    _ensure_owner(community, actor)
    changes = {
        field: value for field, value in data.model_dump(exclude_unset=True).items() if value
    }
    if "name" in changes:
        _ensure_name_available(db, changes["name"], exclude_community_id=community.id)

    for field, value in changes.items():
        setattr(community, field, value)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictError(NAME_TAKEN, field="name") from exc
    return community


def update_cover(
    db: Session, storage: Storage, community: Community, actor: User, image_data: bytes
) -> Community:
    _ensure_owner(community, actor)
    new_key = save_image(storage, image_data, ImageKind.COVER)
    old_key = community.cover_key
    community.cover_key = new_key
    try:
        db.commit()
    except Exception:
        db.rollback()
        storage.delete(new_key)
        raise
    if old_key:
        storage.delete(old_key)
    return community


def join(db: Session, community: Community, user: User) -> None:
    """Entrar na comunidade. Idempotente: entrar duas vezes não gera erro."""
    if is_member(db, community.id, user.id):
        return
    db.add(CommunityMember(community_id=community.id, user_id=user.id))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()  # outra requisição simultânea já registrou a participação


def leave(db: Session, community: Community, user: User) -> None:
    if community.owner_id == user.id:
        raise InvalidInputError("O dono não pode sair da própria comunidade.")
    membership = db.get(CommunityMember, (community.id, user.id))
    if membership is not None:
        db.delete(membership)
        db.commit()


def list_members(
    db: Session, community: Community, limit: int, offset: int
) -> tuple[list[CommunityMemberOut], int]:
    total = db.scalar(select(func.count()).where(CommunityMember.community_id == community.id)) or 0
    memberships = db.scalars(
        select(CommunityMember)
        .where(CommunityMember.community_id == community.id)
        # O dono aparece primeiro; depois, os membros mais antigos. O user_id no final
        # desempata quem entrou no mesmo segundo (paginação estável).
        .order_by(
            (CommunityMember.user_id == community.owner_id).desc(),
            CommunityMember.joined_at,
            CommunityMember.user_id,
        )
        .limit(limit)
        .offset(offset)
    ).all()
    members = [
        CommunityMemberOut(
            user=UserSummary.from_user(membership.user),
            role="owner" if membership.user_id == community.owner_id else "member",
            joined_at=membership.joined_at,
        )
        for membership in memberships
    ]
    return members, total


def _ensure_owner(community: Community, user: User) -> None:
    if community.owner_id != user.id:
        raise PermissionDeniedError("Apenas o dono da comunidade pode fazer isso.")


def _ensure_name_available(db: Session, name: str, exclude_community_id: int | None = None) -> None:
    # A collation padrão do MySQL (utf8mb4_0900_ai_ci) ignora maiúsculas e acentos nesta
    # comparação. Excluímos a própria comunidade para permitir corrigir acentos do nome.
    statement = select(Community.id).where(
        Community.name == name, Community.id != exclude_community_id
    )
    if db.scalar(statement) is not None:
        raise ConflictError(NAME_TAKEN, field="name")


def _members_count_by_community(db: Session, community_ids: list[int]) -> dict[int, int]:
    if not community_ids:
        return {}
    rows = db.execute(
        select(CommunityMember.community_id, func.count())
        .where(CommunityMember.community_id.in_(community_ids))
        .group_by(CommunityMember.community_id)
    ).all()
    return {community_id: count for community_id, count in rows}


def _communities_of_user(db: Session, community_ids: list[int], user_id: int) -> set[int]:
    if not community_ids:
        return set()
    return set(
        db.scalars(
            select(CommunityMember.community_id).where(
                CommunityMember.user_id == user_id,
                CommunityMember.community_id.in_(community_ids),
            )
        )
    )
