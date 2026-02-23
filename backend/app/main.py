from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db
from app.routers.auth import router as auth_router
from app.routers.posts import router as posts_router
from app.routers.users import router as users_router
from app.routers.captcha import router as captcha_router
from app.routers.media import router as media_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="AntiMoltbook API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(posts_router)
app.include_router(users_router)
app.include_router(captcha_router)
app.include_router(media_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
