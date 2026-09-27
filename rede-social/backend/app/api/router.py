from fastapi import APIRouter

from app.api.routers import auth, communities, health, posts, users

api_router = APIRouter(prefix="/api")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(posts.router)
api_router.include_router(communities.router)
