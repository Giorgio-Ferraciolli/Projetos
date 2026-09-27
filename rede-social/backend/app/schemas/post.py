from typing import Annotated

from pydantic import AfterValidator, StringConstraints

from app.schemas.common import ApiModel, UtcDateTime
from app.schemas.community import CommunityRef
from app.schemas.user import UserSummary

MAX_CAPTION_LENGTH = 2200

Caption = (
    Annotated[
        str,
        StringConstraints(strip_whitespace=True, max_length=MAX_CAPTION_LENGTH),
        AfterValidator(lambda value: value or None),
    ]
    | None
)


class PostOut(ApiModel):
    id: int
    caption: str | None
    image_url: str | None
    created_at: UtcDateTime
    author: UserSummary
    community: CommunityRef | None
    likes_count: int
    liked_by_me: bool
    # Calculado no servidor: autor do post ou dono da comunidade podem excluir.
    can_delete: bool


class LikeStatus(ApiModel):
    likes_count: int
    liked_by_me: bool
