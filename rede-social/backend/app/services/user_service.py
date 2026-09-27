"""Regras de negócio de usuários: cadastro, login, perfil e avatar."""

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import (
    AuthenticationError,
    ConflictError,
    InvalidInputError,
    NotFoundError,
)
from app.core.security import hash_password, verify_password
from app.models import CommunityMember, Post, User
from app.schemas.user import PasswordChange, ProfileUpdate, RegisterRequest
from app.services.image_service import ImageKind, save_image
from app.storage import Storage

EMAIL_TAKEN = "Este e-mail já está em uso."
USERNAME_TAKEN = "Este nome de usuário já está em uso."


def register_user(db: Session, data: RegisterRequest) -> User:
    _ensure_email_available(db, data.email)
    _ensure_username_available(db, data.username)

    user = User(
        name=data.name,
        username=data.username,
        email=data.email,
        password_hash=hash_password(data.password),
        birth_date=data.birth_date,
        bio=data.bio,
    )
    db.add(user)
    _commit_or_conflict(db, "E-mail ou nome de usuário já está em uso.")
    return user


def authenticate(db: Session, login: str, password: str) -> User:
    """Login por e-mail ou username. A mensagem de erro é a mesma nos dois casos
    para não revelar quais contas existem."""
    login = login.lower()
    column = User.email if "@" in login else User.username
    user = db.scalar(select(User).where(column == login))

    # A senha é verificada mesmo quando o usuário não existe (tempo de resposta constante).
    password_ok = verify_password(password, user.password_hash if user else None)
    if user is None or not password_ok:
        raise AuthenticationError("E-mail/usuário ou senha incorretos.")
    return user


def get_by_username(db: Session, username: str) -> User:
    user = db.scalar(select(User).where(User.username == username.lower()))
    if user is None:
        raise NotFoundError("Usuário não encontrado.")
    return user


def search_users(db: Session, query: str | None, limit: int, offset: int) -> tuple[list[User], int]:
    statement = select(User)
    if query:
        # autoescape trata % e _ digitados pelo usuário como texto literal.
        statement = statement.where(
            or_(
                User.name.contains(query, autoescape=True),
                User.username.contains(query, autoescape=True),
            )
        )
    total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0
    users = db.scalars(statement.order_by(User.name, User.id).limit(limit).offset(offset)).all()
    return list(users), total


def get_profile_stats(db: Session, user: User) -> tuple[int, int]:
    """Retorna (quantidade de posts, quantidade de comunidades)."""
    posts_count = db.scalar(select(func.count()).where(Post.author_id == user.id)) or 0
    communities_count = (
        db.scalar(select(func.count()).where(CommunityMember.user_id == user.id)) or 0
    )
    return posts_count, communities_count


def update_profile(db: Session, user: User, data: ProfileUpdate) -> User:
    changes = data.model_dump(exclude_unset=True)
    # bio pode ser apagada (None); os demais campos são obrigatórios no modelo.
    changes = {
        field: value for field, value in changes.items() if value is not None or field == "bio"
    }

    if "email" in changes:
        _ensure_email_available(db, changes["email"], exclude_user_id=user.id)
    if "username" in changes:
        _ensure_username_available(db, changes["username"], exclude_user_id=user.id)

    for field, value in changes.items():
        setattr(user, field, value)
    _commit_or_conflict(db, "E-mail ou nome de usuário já está em uso.")
    return user


def change_password(db: Session, user: User, data: PasswordChange) -> None:
    # 400 (e não 401): a sessão é válida, o que está errado é um dado do formulário.
    if not verify_password(data.current_password, user.password_hash):
        raise InvalidInputError("A senha atual está incorreta.", field="current_password")
    user.password_hash = hash_password(data.new_password)
    db.commit()


def update_avatar(db: Session, storage: Storage, user: User, image_data: bytes) -> User:
    new_key = save_image(storage, image_data, ImageKind.AVATAR)
    old_key = user.avatar_key
    user.avatar_key = new_key
    try:
        db.commit()
    except Exception:
        db.rollback()
        storage.delete(new_key)
        raise
    if old_key:
        storage.delete(old_key)
    return user


def remove_avatar(db: Session, storage: Storage, user: User) -> User:
    old_key = user.avatar_key
    user.avatar_key = None
    db.commit()
    if old_key:
        storage.delete(old_key)
    return user


def _ensure_email_available(db: Session, email: str, exclude_user_id: int | None = None) -> None:
    statement = select(User.id).where(User.email == email, User.id != exclude_user_id)
    if db.scalar(statement) is not None:
        raise ConflictError(EMAIL_TAKEN, field="email")


def _ensure_username_available(
    db: Session, username: str, exclude_user_id: int | None = None
) -> None:
    statement = select(User.id).where(User.username == username, User.id != exclude_user_id)
    if db.scalar(statement) is not None:
        raise ConflictError(USERNAME_TAKEN, field="username")


def _commit_or_conflict(db: Session, message: str) -> None:
    # A verificação prévia cobre o caso comum; a constraint UNIQUE do banco cobre
    # requisições simultâneas (condição de corrida).
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictError(message) from exc
