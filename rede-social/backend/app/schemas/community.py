from typing import Annotated, Literal

from pydantic import StringConstraints

from app.schemas.common import ApiModel, UtcDateTime
from app.schemas.user import UserSummary

CommunityName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=3, max_length=80)
]
CommunityDescription = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)
]


class CommunityUpdate(ApiModel):
    """Atualização parcial (PATCH) feita pelo dono da comunidade."""

    name: CommunityName | None = None
    description: CommunityDescription | None = None


class CommunityRef(ApiModel):
    """Referência curta, usada dentro de outros recursos (ex.: em um post)."""

    id: int
    name: str


class CommunitySummary(CommunityRef):
    description: str
    cover_url: str | None
    members_count: int
    is_member: bool


class CommunityDetail(CommunitySummary):
    owner: UserSummary
    posts_count: int
    is_owner: bool
    created_at: UtcDateTime


class CommunityMemberOut(ApiModel):
    user: UserSummary
    role: Literal["owner", "member"]
    joined_at: UtcDateTime
