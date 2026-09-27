from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import DbSession
from app.core.config import settings
from app.core.security import create_access_token
from app.models import User
from app.schemas.user import LoginRequest, RegisterRequest, TokenResponse, UserPrivate
from app.services import user_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_session_cookie(response: Response, user: User) -> None:
    # httpOnly: o JavaScript da página não consegue ler o token (protege contra XSS).
    # SameSite=Lax: o navegador não envia o cookie em POSTs vindos de outros sites (CSRF).
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=create_access_token(user.id),
        max_age=settings.access_token_expire_minutes * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


@router.post("/register", response_model=UserPrivate, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, response: Response, db: DbSession) -> UserPrivate:
    """Cria a conta e já inicia a sessão do novo usuário."""
    user = user_service.register_user(db, data)
    _set_session_cookie(response, user)
    return UserPrivate.from_user(user)


@router.post("/login", response_model=UserPrivate)
def login(data: LoginRequest, response: Response, db: DbSession) -> UserPrivate:
    """Login por e-mail ou nome de usuário. A sessão é mantida em um cookie httpOnly."""
    user = user_service.authenticate(db, data.login, data.password)
    _set_session_cookie(response, user)
    return UserPrivate.from_user(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    response.delete_cookie(
        key=settings.auth_cookie_name,
        path="/",
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
    )


@router.post("/token", response_model=TokenResponse)
def issue_token(
    form: Annotated[OAuth2PasswordRequestForm, Depends()], db: DbSession
) -> TokenResponse:
    """Emite um token Bearer (fluxo OAuth2 password). Usado pelo botão "Authorize"
    da documentação e por clientes de API, como scripts e ferramentas de teste."""
    user = user_service.authenticate(db, form.username, form.password)
    return TokenResponse(access_token=create_access_token(user.id))
