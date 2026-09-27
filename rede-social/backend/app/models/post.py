from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, utc_now
from app.models.community import Community
from app.models.user import User


class Post(TimestampMixin, Base):
    """Publicação. Pode estar no perfil do autor (community_id nulo) ou em uma comunidade.

    Nesta versão cada post tem no máximo uma imagem, então a chave da imagem fica
    na própria tabela. Para várias imagens por post, criaríamos uma tabela post_images.
    """

    __tablename__ = "posts"
    __table_args__ = (
        CheckConstraint("caption IS NOT NULL OR image_key IS NOT NULL", name="has_content"),
        # Índices compostos para as listagens paginadas por id (perfil e comunidade).
        Index("ix_posts_author_id_id", "author_id", "id"),
        Index("ix_posts_community_id_id", "community_id", "id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    community_id: Mapped[int | None] = mapped_column(
        ForeignKey("communities.id", ondelete="CASCADE")
    )
    caption: Mapped[str | None] = mapped_column(Text)
    image_key: Mapped[str | None] = mapped_column(String(255))

    author: Mapped[User] = relationship(lazy="joined")
    community: Mapped[Community | None] = relationship(lazy="joined")

    def __repr__(self) -> str:
        return f"<Post id={self.id} author_id={self.author_id}>"


class PostLike(Base):
    """Curtida de um usuário em um post (no máximo uma por par usuário/post)."""

    __tablename__ = "post_likes"

    post_id: Mapped[int] = mapped_column(
        ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=utc_now, server_default=func.now()
    )
