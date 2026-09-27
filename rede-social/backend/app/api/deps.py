"""Dependências compartilhadas pelos routers (sessão do banco, usuário logado, storage)."""

from typing import Annotated

from fastapi import Depends, HTTPException, Query, Request, UploadFile, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import User
from app.services.image_service import read_upload
from app.storage import Storage, get_storage

# Permite usar o botão "Authorize" da documentação (/api/docs) com token Bearer.
# auto_error=False porque o frontend autentica via cookie httpOnly.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token", auto_error=False)

DbSession = Annotated[Session, Depends(get_db)]
StorageDep = Annotated[Storage, Depends(get_storage)]


def get_current_user(
    request: Request,
    db: DbSession,
    bearer_token: Annotated[str | None, Depends(oauth2_scheme)],
) -> User:
    """Identifica o usuário pelo cookie de sessão ou pelo header Authorization: Bearer."""
    token = bearer_token or request.cookies.get(settings.auth_cookie_name)
    user_id = decode_access_token(token) if token else None
    user = db.get(User, user_id) if user_id is not None else None
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sua sessão expirou. Faça login novamente." if token else "Não autenticado.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]

# Parâmetros de paginação reutilizados pelas listagens.
Limit = Annotated[int, Query(ge=1, le=50)]
Offset = Annotated[int, Query(ge=0, le=10_000)]
Cursor = Annotated[
    int | None, Query(ge=1, le=2**31 - 1, description="Valor de next_cursor da página anterior")
]
SearchQuery = Annotated[str | None, Query(max_length=100, description="Texto para busca")]


def read_optional_image(file: UploadFile | None) -> bytes | None:
    """Lê um upload opcional (formulários enviam o campo vazio quando não há arquivo)."""
    if file is None or not file.filename:
        return None
    return read_upload(file.file)
