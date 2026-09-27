from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.deps import DbSession

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
def liveness() -> dict[str, str]:
    """O processo está no ar (usado por healthchecks do Docker/orquestradores)."""
    return {"status": "ok"}


@router.get("/ready")
def readiness(db: DbSession) -> JSONResponse:
    """A aplicação consegue atender requisições (banco acessível)."""
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse({"status": "unavailable", "database": "down"}, status_code=503)
    return JSONResponse({"status": "ok", "database": "up"})
