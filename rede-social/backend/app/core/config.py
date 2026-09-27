"""Configuração da aplicação, lida de variáveis de ambiente (12-factor)."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL

# Valores usados apenas em desenvolvimento. Em produção a aplicação se recusa a subir com eles.
DEV_SECRET_KEY = "dev-only-insecure-secret-key-change-me-0123456789"
DEV_DB_PASSWORD = "rede_social_dev_password"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Rede Social"
    environment: Literal["development", "test", "production"] = "development"

    # Banco de dados (MySQL)
    db_host: str = "localhost"
    db_port: int = 3306
    db_name: str = "rede_social"
    db_user: str = "rede_social"
    db_password: str = DEV_DB_PASSWORD

    # Autenticação
    secret_key: str = Field(default=DEV_SECRET_KEY, min_length=32)
    access_token_expire_minutes: int = Field(default=60 * 24, gt=0)
    auth_cookie_name: str = "access_token"
    cookie_secure: bool = False

    # Lista separada por vírgulas. Vazia = CORS desabilitado (frontend e API na mesma origem).
    cors_origins: str = ""

    # Uploads
    media_root: Path = Path("media")
    media_url: str = "/media"
    max_upload_size_mb: int = Field(default=5, gt=0)

    # Logs
    log_level: str = "INFO"
    log_format: Literal["json", "text"] = "json"

    @model_validator(mode="after")
    def _check_production_settings(self) -> "Settings":
        if self.environment != "production":
            return self
        if self.secret_key == DEV_SECRET_KEY:
            raise ValueError("Defina SECRET_KEY com um valor seguro em produção.")
        if self.db_password == DEV_DB_PASSWORD:
            raise ValueError("Defina DB_PASSWORD com um valor seguro em produção.")
        if not self.cookie_secure:
            raise ValueError("Use COOKIE_SECURE=true em produção (exige HTTPS).")
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    @property
    def test_db_name(self) -> str:
        return f"{self.db_name}_test"

    def database_url(self, database: str | None = None) -> URL:
        # URL.create escapa corretamente caracteres especiais na senha.
        return URL.create(
            drivername="mysql+pymysql",
            username=self.db_user,
            password=self.db_password,
            host=self.db_host,
            port=self.db_port,
            database=database or self.db_name,
            query={"charset": "utf8mb4"},
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
