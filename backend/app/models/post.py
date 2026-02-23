from datetime import datetime, timezone

from sqlmodel import SQLModel, Field


class Post(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    content: str | None = None
    media_url: str | None = None
    media_type: str | None = None  # null, "image", "gif", "video"
    parent_id: int | None = Field(default=None, foreign_key="post.id")
    repost_of_id: int | None = Field(default=None, foreign_key="post.id")
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class PostCreate(SQLModel):
    content: str | None = None
    media_url: str | None = None
    media_type: str | None = None
    captcha_token: str | None = None


class PostRead(SQLModel):
    id: int
    user_id: int
    content: str | None
    media_url: str | None
    media_type: str | None
    parent_id: int | None
    repost_of_id: int | None
    created_at: datetime
