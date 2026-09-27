from datetime import date

from sqlalchemy import Date, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    # username e email são normalizados em minúsculas antes de salvar.
    username: Mapped[str] = mapped_column(String(30), unique=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    # Guardamos a data de nascimento (não a idade), pois a idade muda com o tempo.
    birth_date: Mapped[date] = mapped_column(Date)
    bio: Mapped[str | None] = mapped_column(String(500))
    # Chave do arquivo no storage (ex.: "avatars/abc.webp"), não a URL completa.
    avatar_key: Mapped[str | None] = mapped_column(String(255))

    def __repr__(self) -> str:
        return f"<User id={self.id} username={self.username!r}>"
