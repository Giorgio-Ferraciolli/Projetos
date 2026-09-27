from datetime import date
from typing import Annotated, Self

from pydantic import AfterValidator, EmailStr, Field, StringConstraints

from app.models import User
from app.schemas.common import ApiModel, UtcDateTime, calculate_age
from app.storage import public_url

MIN_AGE = 13
MAX_AGE = 120
RESERVED_USERNAMES = {"me", "admin", "api", "root"}


def _validate_username(value: str) -> str:
    value = value.lower()
    if value in RESERVED_USERNAMES:
        raise ValueError("Este nome de usuário não está disponível.")
    return value


def _validate_birth_date(value: date) -> date:
    if value > date.today():
        raise ValueError("A data de nascimento não pode estar no futuro.")
    age = calculate_age(value)
    if age < MIN_AGE:
        raise ValueError(f"É preciso ter pelo menos {MIN_AGE} anos.")
    if age > MAX_AGE:
        raise ValueError("Data de nascimento inválida.")
    return value


def _empty_to_none(value: str | None) -> str | None:
    return value or None


# Tipos reutilizáveis com as regras de validação de cada campo.
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=100)]
Username = Annotated[
    str,
    StringConstraints(strip_whitespace=True, pattern=r"^[A-Za-z0-9_.]{3,30}$"),
    AfterValidator(_validate_username),
]
Email = Annotated[EmailStr, AfterValidator(str.lower), Field(max_length=255)]
Password = Annotated[str, StringConstraints(min_length=8, max_length=128)]
BirthDate = Annotated[date, AfterValidator(_validate_birth_date)]
Bio = (
    Annotated[
        str,
        StringConstraints(strip_whitespace=True, max_length=500),
        AfterValidator(_empty_to_none),
    ]
    | None
)


# ---------- Entrada ----------


class RegisterRequest(ApiModel):
    name: Name
    username: Username
    email: Email
    password: Password
    birth_date: BirthDate
    bio: Bio = None


class LoginRequest(ApiModel):
    login: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]
    password: Annotated[str, StringConstraints(min_length=1, max_length=128)]


class ProfileUpdate(ApiModel):
    """Atualização parcial (PATCH): apenas os campos enviados são alterados."""

    name: Name | None = None
    username: Username | None = None
    email: Email | None = None
    birth_date: BirthDate | None = None
    bio: Bio = None


class PasswordChange(ApiModel):
    current_password: Annotated[str, StringConstraints(min_length=1, max_length=128)]
    new_password: Password


# ---------- Saída ----------
# Nenhum schema de saída contém password_hash. E-mail e data de nascimento
# completos só aparecem para o próprio usuário (UserPrivate).


class UserSummary(ApiModel):
    id: int
    name: str
    username: str
    avatar_url: str | None

    @classmethod
    def from_user(cls, user: User) -> Self:
        return cls(
            id=user.id,
            name=user.name,
            username=user.username,
            avatar_url=public_url(user.avatar_key),
        )


class UserProfile(UserSummary):
    bio: str | None
    age: int
    posts_count: int
    communities_count: int
    created_at: UtcDateTime

    @classmethod
    def from_user_with_stats(cls, user: User, posts_count: int, communities_count: int) -> Self:
        return cls(
            **UserSummary.from_user(user).model_dump(),
            bio=user.bio,
            age=calculate_age(user.birth_date),
            posts_count=posts_count,
            communities_count=communities_count,
            created_at=user.created_at,
        )


class UserPrivate(UserSummary):
    email: str
    bio: str | None
    birth_date: date
    age: int
    created_at: UtcDateTime

    @classmethod
    def from_user(cls, user: User) -> Self:
        return cls(
            **UserSummary.from_user(user).model_dump(),
            email=user.email,
            bio=user.bio,
            birth_date=user.birth_date,
            age=calculate_age(user.birth_date),
            created_at=user.created_at,
        )


class TokenResponse(ApiModel):
    access_token: str
    token_type: str = "bearer"
