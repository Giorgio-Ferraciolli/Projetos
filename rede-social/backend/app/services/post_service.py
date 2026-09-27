"""Regras de negócio de publicações, feed e curtidas."""

from sqlalchemy import Select, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import InvalidInputError, NotFoundError, PermissionDeniedError
from app.models import Community, CommunityMember, Post, PostLike, User
from app.schemas.common import CursorPage
from app.schemas.community import CommunityRef
from app.schemas.post import LikeStatus, PostOut
from app.schemas.user import UserSummary
from app.services import community_service
from app.services.image_service import ImageKind, save_image
from app.storage import Storage, public_url


def create_post(
    db: Session,
    storage: Storage,
    author: User,
    caption: str | None,
    community_id: int | None,
    image_data: bytes | None,
) -> Post:
    if not caption and not image_data:
        raise InvalidInputError("A publicação precisa de uma imagem ou de uma legenda.")

    if community_id is not None:
        community = community_service.get_community(db, community_id)
        if not community_service.is_member(db, community.id, author.id):
            raise PermissionDeniedError("Você precisa participar da comunidade para publicar nela.")

    # A imagem é gravada antes do commit; se o banco falhar, removemos o arquivo órfão.
    image_key = save_image(storage, image_data, ImageKind.POST) if image_data else None
    post = Post(author=author, community_id=community_id, caption=caption, image_key=image_key)
    db.add(post)
    try:
        db.commit()
    except Exception:
        db.rollback()
        if image_key:
            storage.delete(image_key)
        raise
    db.refresh(post)  # carrega o relacionamento com a comunidade
    return post


def get_post(db: Session, post_id: int) -> Post:
    post = db.get(Post, post_id)
    if post is None:
        raise NotFoundError("Publicação não encontrada.")
    return post


def delete_post(db: Session, storage: Storage, post: Post, actor: User) -> None:
    if not can_delete(post, actor):
        raise PermissionDeniedError("Você não tem permissão para excluir esta publicação.")
    image_key = post.image_key
    db.delete(post)
    db.commit()
    if image_key:
        storage.delete(image_key)


def can_delete(post: Post, user: User) -> bool:
    """O autor pode excluir o próprio post; o dono da comunidade modera os posts dela."""
    is_author = post.author_id == user.id
    is_community_owner = post.community is not None and post.community.owner_id == user.id
    return is_author or is_community_owner


# ---------- Listagens ----------


def list_feed(db: Session, viewer: User, cursor: int | None, limit: int) -> CursorPage[PostOut]:
    """Feed: posts de perfil de todos os usuários + posts das comunidades do usuário."""
    my_communities = select(CommunityMember.community_id).where(
        CommunityMember.user_id == viewer.id
    )
    statement = select(Post).where(
        or_(Post.community_id.is_(None), Post.community_id.in_(my_communities))
    )
    return _paginate(db, statement, viewer, cursor, limit)


def list_user_posts(
    db: Session, viewer: User, author: User, cursor: int | None, limit: int
) -> CursorPage[PostOut]:
    statement = select(Post).where(Post.author_id == author.id)
    return _paginate(db, statement, viewer, cursor, limit)


def list_community_posts(
    db: Session, viewer: User, community: Community, cursor: int | None, limit: int
) -> CursorPage[PostOut]:
    statement = select(Post).where(Post.community_id == community.id)
    return _paginate(db, statement, viewer, cursor, limit)


def _paginate(
    db: Session, statement: Select[tuple[Post]], viewer: User, cursor: int | None, limit: int
) -> CursorPage[PostOut]:
    # Ids são crescentes, então ordenar por id equivale a ordenar por data de criação.
    if cursor is not None:
        statement = statement.where(Post.id < cursor)
    # Buscamos um item a mais só para saber se existe próxima página.
    posts = list(db.scalars(statement.order_by(Post.id.desc()).limit(limit + 1)).unique())
    has_more = len(posts) > limit
    posts = posts[:limit]
    next_cursor = posts[-1].id if has_more else None
    return CursorPage(items=to_post_views(db, posts, viewer), next_cursor=next_cursor)


def to_post_views(db: Session, posts: list[Post], viewer: User) -> list[PostOut]:
    """Converte posts em respostas, buscando curtidas em lote (evita N+1 queries)."""
    post_ids = [post.id for post in posts]
    likes_count = _likes_count_by_post(db, post_ids)
    liked_by_viewer = _posts_liked_by(db, post_ids, viewer.id)
    return [
        PostOut(
            id=post.id,
            caption=post.caption,
            image_url=public_url(post.image_key),
            created_at=post.created_at,
            author=UserSummary.from_user(post.author),
            community=CommunityRef(id=post.community.id, name=post.community.name)
            if post.community
            else None,
            likes_count=likes_count.get(post.id, 0),
            liked_by_me=post.id in liked_by_viewer,
            can_delete=can_delete(post, viewer),
        )
        for post in posts
    ]


# ---------- Curtidas ----------


def like_post(db: Session, post: Post, user: User) -> LikeStatus:
    """Curtir é idempotente: curtir de novo não duplica nem gera erro."""
    if db.get(PostLike, (post.id, user.id)) is None:
        db.add(PostLike(post_id=post.id, user_id=user.id))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()  # curtida registrada por uma requisição simultânea
    return _like_status(db, post.id, user.id)


def unlike_post(db: Session, post: Post, user: User) -> LikeStatus:
    like = db.get(PostLike, (post.id, user.id))
    if like is not None:
        db.delete(like)
        db.commit()
    return _like_status(db, post.id, user.id)


def _like_status(db: Session, post_id: int, user_id: int) -> LikeStatus:
    return LikeStatus(
        likes_count=_likes_count_by_post(db, [post_id]).get(post_id, 0),
        liked_by_me=bool(_posts_liked_by(db, [post_id], user_id)),
    )


def _likes_count_by_post(db: Session, post_ids: list[int]) -> dict[int, int]:
    if not post_ids:
        return {}
    rows = db.execute(
        select(PostLike.post_id, func.count())
        .where(PostLike.post_id.in_(post_ids))
        .group_by(PostLike.post_id)
    ).all()
    return {post_id: count for post_id, count in rows}


def _posts_liked_by(db: Session, post_ids: list[int], user_id: int) -> set[int]:
    if not post_ids:
        return set()
    return set(
        db.scalars(
            select(PostLike.post_id).where(
                PostLike.user_id == user_id, PostLike.post_id.in_(post_ids)
            )
        )
    )
