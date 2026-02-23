from datetime import datetime, timezone

from sqlmodel import SQLModel, Field


class CaptchaChallenge(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int | None = Field(default=None, foreign_key="user.id")
    challenge_type: str  # draw_shape, draw_freeform, type_backwards, type_pattern, speed_type
    challenge_data: str  # JSON string
    response_data: str | None = None  # JSON string
    server_passed: bool | None = None
    crowd_status: str = "not_needed"  # not_needed, pending_review, approved, rejected
    context: str = "post"  # signup, post
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CaptchaReview(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    challenge_id: int = Field(foreign_key="captchachallenge.id")
    reviewer_id: int = Field(foreign_key="user.id")
    approved: bool
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
