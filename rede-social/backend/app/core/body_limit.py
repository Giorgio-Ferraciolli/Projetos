"""Limite de tamanho do corpo das requisições.

Sem este limite, um upload gigante seria recebido inteiro (e gravado em disco
temporário) antes de o código da rota verificar o tamanho do arquivo. Aqui a
requisição é recusada logo no início, pelo header Content-Length, ou assim que o
volume recebido passa do limite.
"""

from fastapi import HTTPException
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

TOO_LARGE_MESSAGE = "A requisição é grande demais."


class BodySizeLimitMiddleware:
    def __init__(self, app: ASGIApp, max_body_size: int) -> None:
        self.app = app
        self.max_body_size = max_body_size

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        content_length = dict(scope["headers"]).get(b"content-length", b"")
        if content_length.isdigit() and int(content_length) > self.max_body_size:
            response = JSONResponse({"detail": TOO_LARGE_MESSAGE}, status_code=413)
            await response(scope, receive, send)
            return

        received = 0

        async def limited_receive() -> Message:
            # Cobre também requisições sem Content-Length (envio em partes, "chunked").
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_body_size:
                    raise HTTPException(status_code=413, detail=TOO_LARGE_MESSAGE)
            return message

        await self.app(scope, limited_receive, send)
