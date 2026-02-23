from datetime import datetime, timezone

from sqlmodel import SQLModel, Field, UniqueConstraint


class Like(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("user_id", "post_id"),)

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    post_id: int = Field(foreign_key="post.id")
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
