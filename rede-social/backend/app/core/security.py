"""Hash de senhas e tokens de acesso (JWT)."""

from datetime import UTC, datetime, timedelta

import jwt
from pwdlib import PasswordHash

from app.core.config import settings

JWT_ALGORITHM = "HS256"

# Argon2id: algoritmo recomendado atualmente para hash de senhas.
_password_hasher = PasswordHash.recommended()

# Hash calculado uma vez para equalizar o tempo de resposta do login quando o
# usuário não existe (evita descobrir e-mails cadastrados pelo tempo de resposta).
_DUMMY_HASH = _password_hasher.hash("dummy-password-used-only-for-timing")


def hash_password(password: str) -> str:
    return _password_hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    if password_hash is None:
        _password_hasher.verify(password, _DUMMY_HASH)
        return False
    return _password_hasher.verify(password, password_hash)


def create_access_token(user_id: int) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> int | None:
    """Retorna o id do usuário do token, ou None se o token for inválido/expirado."""
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[JWT_ALGORITHM],
            options={"require": ["sub", "exp"]},
        )
        return int(payload["sub"])
    except (jwt.InvalidTokenError, ValueError):
        return None
