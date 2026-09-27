"""Erros de domínio.

Os services lançam estas exceções sem conhecer HTTP. Um handler registrado em
`app.main` as converte na resposta JSON adequada.
"""


class AppError(Exception):
    status_code: int = 400

    def __init__(self, detail: str, field: str | None = None) -> None:
        super().__init__(detail)
        self.detail = detail
        # Campo do formulário relacionado ao erro (ex.: "email"), quando houver.
        self.field = field


class InvalidInputError(AppError):
    status_code = 400


class AuthenticationError(AppError):
    status_code = 401


class PermissionDeniedError(AppError):
    status_code = 403


class NotFoundError(AppError):
    status_code = 404


class ConflictError(AppError):
    status_code = 409


class PayloadTooLargeError(AppError):
    status_code = 413
