from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, utc_now
from app.models.user import User


class Community(TimestampMixin, Base):
    """Comunidade (grupo). A tabela não se chama "groups" porque GROUPS é palavra
    reservada no MySQL 8."""

    __tablename__ = "communities"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    description: Mapped[str] = mapped_column(String(1000))
    cover_key: Mapped[str | None] = mapped_column(String(255))
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    owner: Mapped[User] = relationship(lazy="joined")

    def __repr__(self) -> str:
        return f"<Community id={self.id} name={self.name!r}>"


class CommunityMember(Base):
    """Participação de um usuário em uma comunidade.

    O dono é identificado por `Community.owner_id` e também é registrado como membro.
    Se no futuro houver moderadores, basta adicionar uma coluna `role` aqui.
    """

    __tablename__ = "community_members"

    community_id: Mapped[int] = mapped_column(
        ForeignKey("communities.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime, default=utc_now, server_default=func.now()
    )

    community: Mapped[Community] = relationship()
    user: Mapped[User] = relationship(lazy="joined")
