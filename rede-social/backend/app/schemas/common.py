from datetime import UTC, date, datetime
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict


def _as_utc(value: datetime) -> datetime:
    # O banco guarda horários em UTC sem timezone. Marcamos como UTC para que o JSON
    # saia com "+00:00" e o navegador converta corretamente para o horário local.
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


UtcDateTime = Annotated[datetime, AfterValidator(_as_utc)]


def calculate_age(birth_date: date, today: date | None = None) -> int:
    today = today or date.today()
    had_birthday = (today.month, today.day) >= (birth_date.month, birth_date.day)
    return today.year - birth_date.year - (0 if had_birthday else 1)


class ApiModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Page[T](ApiModel):
    """Página de resultados com paginação por offset (listas ordenadas por nome, etc.)."""

    items: list[T]
    total: int
    limit: int
    offset: int


class CursorPage[T](ApiModel):
    """Página com paginação por cursor, usada em feeds.

    O cliente envia `cursor=<next_cursor>` para buscar a próxima página. Diferente do
    offset, não repete nem pula itens quando novos posts são publicados.
    """

    items: list[T]
    next_cursor: int | None


class Message(ApiModel):
    detail: str
