from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select, func

from app.core.database import get_session
from app.core.deps import get_current_user
from app.models.user import User, UserRead, UserUpdate
from app.models.post import Post
from app.models.follow import Follow

router = APIRouter(prefix="/api/users", tags=["users"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class UserProfile(UserRead):
    follower_count: int = 0
    following_count: int = 0
    post_count: int = 0


def _get_user_by_username(username: str, session: Session) -> User:
    user = session.exec(select(User).where(User.username == username)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _build_profile(user: User, session: Session) -> UserProfile:
    follower_count = session.exec(
        select(func.count()).select_from(Follow).where(Follow.following_id == user.id)
    ).one()
    following_count = session.exec(
        select(func.count()).select_from(Follow).where(Follow.follower_id == user.id)
    ).one()
    post_count = session.exec(
        select(func.count()).select_from(Post).where(Post.user_id == user.id)
    ).one()
    return UserProfile(
        **UserRead.model_validate(user).model_dump(),
        follower_count=follower_count,
        following_count=following_count,
        post_count=post_count,
    )


# ---------------------------------------------------------------------------
# Update own profile  (must be declared before /{username} to avoid clash)
# ---------------------------------------------------------------------------
@router.put("/me", response_model=UserRead)
def update_me(
    user_update: UserUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    update_data = user_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(current_user, key, value)
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user


# ---------------------------------------------------------------------------
# Get user profile
# ---------------------------------------------------------------------------
@router.get("/{username}", response_model=UserProfile)
def get_user_profile(
    username: str,
    session: Session = Depends(get_session),
):
    user = _get_user_by_username(username, session)
    return _build_profile(user, session)


# ---------------------------------------------------------------------------
# Follow a user
# ---------------------------------------------------------------------------
@router.post("/{username}/follow", status_code=201)
def follow_user(
    username: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    target = _get_user_by_username(username, session)
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    existing = session.exec(
        select(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.following_id == target.id,
        )
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already following")

    follow = Follow(follower_id=current_user.id, following_id=target.id)
    session.add(follow)
    session.commit()
    return {"detail": "Followed"}


# ---------------------------------------------------------------------------
# Unfollow a user
# ---------------------------------------------------------------------------
@router.delete("/{username}/follow", status_code=204)
def unfollow_user(
    username: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    target = _get_user_by_username(username, session)

    follow = session.exec(
        select(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.following_id == target.id,
        )
    ).first()
    if not follow:
        raise HTTPException(status_code=404, detail="Not following this user")

    session.delete(follow)
    session.commit()
    return None


# ---------------------------------------------------------------------------
# List followers
# ---------------------------------------------------------------------------
@router.get("/{username}/followers", response_model=list[UserRead])
def list_followers(
    username: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session),
):
    target = _get_user_by_username(username, session)
    statement = (
        select(User)
        .join(Follow, Follow.follower_id == User.id)
        .where(Follow.following_id == target.id)
        .offset(offset)
        .limit(limit)
    )
    users = session.exec(statement).all()
    return users


# ---------------------------------------------------------------------------
# List following
# ---------------------------------------------------------------------------
@router.get("/{username}/following", response_model=list[UserRead])
def list_following(
    username: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session),
):
    target = _get_user_by_username(username, session)
    statement = (
        select(User)
        .join(Follow, Follow.following_id == User.id)
        .where(Follow.follower_id == target.id)
        .offset(offset)
        .limit(limit)
    )
    users = session.exec(statement).all()
    return users
