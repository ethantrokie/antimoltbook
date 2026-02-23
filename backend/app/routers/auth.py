from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.database import get_session
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.models.user import User, UserCreate, UserRead

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=201)
def register(user_in: UserCreate, session: Session = Depends(get_session)):
    existing = session.exec(
        select(User).where(
            (User.email == user_in.email) | (User.username == user_in.username)
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=400, detail="Email or username already taken"
        )
    user = User(
        email=user_in.email,
        username=user_in.username,
        display_name=user_in.display_name,
        password_hash=hash_password(user_in.password),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.post("/login")
def login(credentials: dict, session: Session = Depends(get_session)):
    user = session.exec(
        select(User).where(User.email == credentials["email"])
    ).first()
    if not user or not verify_password(credentials["password"], user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token_data = {"sub": user.username, "user_id": user.id}
    return {
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
        "user": UserRead.model_validate(user),
    }


@router.post("/refresh")
def refresh(body: dict):
    payload = decode_token(body["refresh_token"])
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    return {
        "access_token": create_access_token(
            {"sub": payload["sub"], "user_id": payload["user_id"]}
        )
    }
