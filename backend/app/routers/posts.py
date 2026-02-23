from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select, func

from app.core.database import get_session
from app.core.deps import get_current_user
from app.models.post import Post, PostCreate, PostRead
from app.models.like import Like
from app.models.follow import Follow
from app.models.user import User

router = APIRouter(prefix="/api", tags=["posts"])


# ---------------------------------------------------------------------------
# Create post
# ---------------------------------------------------------------------------
@router.post("/posts", response_model=PostRead, status_code=201)
def create_post(
    post_in: PostCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    # captcha_token validation skipped for now
    post = Post(
        user_id=current_user.id,
        content=post_in.content,
        media_url=post_in.media_url,
        media_type=post_in.media_type,
    )
    session.add(post)
    session.commit()
    session.refresh(post)
    return post


# ---------------------------------------------------------------------------
# Global feed (excludes replies)
# ---------------------------------------------------------------------------
@router.get("/feed/global", response_model=list[PostRead])
def global_feed(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session),
):
    statement = (
        select(Post)
        .where(Post.parent_id == None)  # noqa: E711
        .order_by(Post.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    posts = session.exec(statement).all()
    return posts


# ---------------------------------------------------------------------------
# Home feed (posts from followed users)
# ---------------------------------------------------------------------------
@router.get("/feed", response_model=list[PostRead])
def home_feed(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    statement = (
        select(Post)
        .join(Follow, Follow.following_id == Post.user_id)
        .where(Follow.follower_id == current_user.id)
        .where(Post.parent_id == None)  # noqa: E711
        .order_by(Post.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    posts = session.exec(statement).all()
    return posts


# ---------------------------------------------------------------------------
# Get single post
# ---------------------------------------------------------------------------
@router.get("/posts/{post_id}", response_model=PostRead)
def get_post(
    post_id: int,
    session: Session = Depends(get_session),
):
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


# ---------------------------------------------------------------------------
# Delete own post
# ---------------------------------------------------------------------------
@router.delete("/posts/{post_id}", status_code=204)
def delete_post(
    post_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to delete this post")
    session.delete(post)
    session.commit()
    return None


# ---------------------------------------------------------------------------
# Like a post
# ---------------------------------------------------------------------------
@router.post("/posts/{post_id}/like", status_code=201)
def like_post(
    post_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    existing = session.exec(
        select(Like).where(
            Like.user_id == current_user.id, Like.post_id == post_id
        )
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already liked")

    like = Like(user_id=current_user.id, post_id=post_id)
    session.add(like)
    session.commit()
    return {"detail": "Liked"}


# ---------------------------------------------------------------------------
# Unlike a post
# ---------------------------------------------------------------------------
@router.delete("/posts/{post_id}/like", status_code=204)
def unlike_post(
    post_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    like = session.exec(
        select(Like).where(
            Like.user_id == current_user.id, Like.post_id == post_id
        )
    ).first()
    if not like:
        raise HTTPException(status_code=404, detail="Like not found")
    session.delete(like)
    session.commit()
    return None


# ---------------------------------------------------------------------------
# Reply to a post
# ---------------------------------------------------------------------------
@router.post("/posts/{post_id}/reply", response_model=PostRead, status_code=201)
def reply_to_post(
    post_id: int,
    reply_in: PostCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    parent = session.get(Post, post_id)
    if not parent:
        raise HTTPException(status_code=404, detail="Post not found")

    reply = Post(
        user_id=current_user.id,
        content=reply_in.content,
        media_url=reply_in.media_url,
        media_type=reply_in.media_type,
        parent_id=post_id,
    )
    session.add(reply)
    session.commit()
    session.refresh(reply)
    return reply


# ---------------------------------------------------------------------------
# Repost
# ---------------------------------------------------------------------------
class RepostBody(PostCreate):
    """For reposts we only really need captcha_token."""
    content: str | None = None
    media_url: str | None = None
    media_type: str | None = None


@router.post("/posts/{post_id}/repost", response_model=PostRead, status_code=201)
def repost(
    post_id: int,
    body: RepostBody = RepostBody(),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    original = session.get(Post, post_id)
    if not original:
        raise HTTPException(status_code=404, detail="Post not found")

    repost_post = Post(
        user_id=current_user.id,
        repost_of_id=post_id,
    )
    session.add(repost_post)
    session.commit()
    session.refresh(repost_post)
    return repost_post
