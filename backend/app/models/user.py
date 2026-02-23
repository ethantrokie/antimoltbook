from datetime import datetime, timezone

from sqlmodel import SQLModel, Field


class UserBase(SQLModel):
    email: str = Field(unique=True, index=True)
    username: str = Field(unique=True, index=True)
    display_name: str


class User(UserBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    bio: str | None = None
    avatar_url: str | None = None
    password_hash: str
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class UserCreate(SQLModel):
    email: str
    username: str
    display_name: str
    password: str


class UserRead(SQLModel):
    id: int
    email: str
    username: str
    display_name: str
    bio: str | None
    avatar_url: str | None
    created_at: datetime


class UserUpdate(SQLModel):
    display_name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
