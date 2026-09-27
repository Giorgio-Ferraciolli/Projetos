import pytest
from pydantic import ValidationError

from app.core.config import DEV_DB_PASSWORD, DEV_SECRET_KEY, Settings

SAFE_PRODUCTION = {
    "environment": "production",
    "secret_key": "a" * 48,
    "db_password": "senha-forte-de-producao",
    "cookie_secure": True,
}


def test_production_settings_with_safe_values_are_accepted() -> None:
    assert Settings(**SAFE_PRODUCTION).environment == "production"


@pytest.mark.parametrize(
    "override",
    [
        {"secret_key": DEV_SECRET_KEY},
        {"db_password": DEV_DB_PASSWORD},
        {"cookie_secure": False},
    ],
)
def test_production_refuses_development_defaults(override: dict) -> None:
    with pytest.raises(ValidationError):
        Settings(**{**SAFE_PRODUCTION, **override})


def test_development_accepts_defaults() -> None:
    assert Settings(environment="development").secret_key == DEV_SECRET_KEY
