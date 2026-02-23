from datetime import datetime, timezone

from sqlmodel import SQLModel, Field, UniqueConstraint


class Follow(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("follower_id", "following_id"),)

    id: int | None = Field(default=None, primary_key=True)
    follower_id: int = Field(foreign_key="user.id")
    following_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
