from functools import lru_cache

from app.core.config import settings
from app.storage.base import Storage
from app.storage.local import LocalStorage


@lru_cache
def get_storage() -> Storage:
    """Storage usado pela aplicação (também é uma dependência do FastAPI)."""
    return LocalStorage(root=settings.media_root, base_url=settings.media_url)


def public_url(key: str | None) -> str | None:
    """URL pública de um arquivo a partir da chave salva no banco."""
    return get_storage().url_for(key) if key else None


__all__ = ["LocalStorage", "Storage", "get_storage", "public_url"]
