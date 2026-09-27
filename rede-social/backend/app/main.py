"""Ponto de entrada da API: cria a aplicação FastAPI e registra routers e handlers."""

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.body_limit import BodySizeLimitMiddleware
from app.core.config import settings
from app.core.exceptions import AppError
from app.observability import setup_observability


def create_app() -> FastAPI:
    app = FastAPI(
        title=f"{settings.app_name} API",
        version="0.1.0",
        description="API REST da Rede Social (projeto de estudos).",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
    )
    _register_exception_handlers(app)
    app.include_router(api_router)

    # Arquivos enviados (storage local). Com S3, as URLs apontariam direto para o bucket/CDN.
    settings.media_root.mkdir(parents=True, exist_ok=True)
    app.mount(settings.media_url, StaticFiles(directory=settings.media_root), name="media")

    # Middlewares: o último adicionado é o mais externo (o primeiro a receber a requisição).
    # Margem de 1 MB além do arquivo para os demais campos do formulário.
    app.add_middleware(
        BodySizeLimitMiddleware, max_body_size=settings.max_upload_size_bytes + 1024 * 1024
    )
    if settings.cors_origin_list:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origin_list,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    # Por último: logs com request_id envolvem todas as camadas acima.
    setup_observability(app, settings)
    return app


def _register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(_: Request, exc: AppError) -> JSONResponse:
        content: dict = {"detail": exc.detail}
        if exc.field:
            content["errors"] = [{"field": exc.field, "message": exc.detail}]
        return JSONResponse(content, status_code=exc.status_code)

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        # Formato simples e estável: uma mensagem geral + erros por campo.
        errors = [
            {
                "field": ".".join(str(part) for part in error["loc"][1:]) or str(error["loc"][0]),
                "message": error["msg"].removeprefix("Value error, "),
            }
            for error in exc.errors()
        ]
        content = {"detail": "Verifique os dados informados.", "errors": errors}
        return JSONResponse(jsonable_encoder(content), status_code=422)

    # Erros inesperados (500) são tratados em RequestContextMiddleware, que registra o
    # log com o request_id da requisição.


app = create_app()
