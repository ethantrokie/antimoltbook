# AntiMoltbook Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a social media platform (X/Twitter clone) with creative CAPTCHA challenges that gate sign-up and every post, preventing AI agents from posting.

**Architecture:** Next.js 14 frontend on Vercel + FastAPI backend in Docker with SQLite (WAL mode). Two-step post flow: complete CAPTCHA challenge, then submit post with token. Hybrid validation (server + crowd review).

**Tech Stack:** Next.js 14 (App Router), Tailwind CSS, FastAPI, SQLModel, SQLite, pytest, Vitest, React Testing Library, Docker

---

## Phase 1: Backend Foundation

### Task 1: Project Scaffolding & Backend Skeleton

**Files:**
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/core/__init__.py`
- Create: `backend/app/core/config.py`
- Create: `backend/app/core/database.py`
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/routers/__init__.py`
- Create: `backend/app/services/__init__.py`
- Create: `backend/requirements.txt`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`

**Step 1: Create requirements.txt**

```txt
fastapi==0.115.0
uvicorn[standard]==0.30.6
sqlmodel==0.0.22
pydantic[email]==2.9.2
pydantic-settings==2.5.2
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.12
httpx==0.27.2
pytest==8.3.3
pytest-asyncio==0.24.0
```

**Step 2: Create config.py**

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "sqlite:///./data/antimoltbook.db"
    jwt_secret: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    captcha_token_expire_minutes: int = 5
    upload_dir: str = "./uploads"
    max_gif_size: int = 5 * 1024 * 1024
    max_video_size: int = 10 * 1024 * 1024
    allowed_origins: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"

settings = Settings()
```

**Step 3: Create database.py with SQLite WAL mode**

```python
from sqlmodel import SQLModel, Session, create_engine
from app.core.config import settings

connect_args = {"check_same_thread": False}
engine = create_engine(settings.database_url, connect_args=connect_args)

def init_db():
    import sqlite3
    db_path = settings.database_url.replace("sqlite:///", "")
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.close()
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
```

**Step 4: Create main.py**

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db

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

@app.get("/api/health")
def health():
    return {"status": "ok"}
```

**Step 5: Create conftest.py with in-memory test DB**

```python
import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
from app.main import app
from app.core.database import get_session

@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session

@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        yield session
    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()
```

**Step 6: Write health check test**

Create `backend/tests/test_health.py`:
```python
def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

**Step 7: Run test to verify it passes**

Run: `cd backend && pip install -r requirements.txt && pytest tests/test_health.py -v`
Expected: PASS

**Step 8: Commit**

```
git init && git add -A && git commit -m "feat: backend skeleton with FastAPI, SQLite config, health endpoint, test fixtures"
```

---

### Task 2: User Model & Auth Service

**Files:**
- Create: `backend/app/models/user.py`
- Create: `backend/app/services/auth.py`
- Create: `backend/app/core/security.py`
- Create: `backend/tests/test_auth.py`

**Step 1: Write failing auth tests**

Create `backend/tests/test_auth.py`:
```python
from app.services.auth import hash_password, verify_password, create_access_token, decode_token

def test_hash_and_verify_password():
    hashed = hash_password("mypassword123")
    assert hashed != "mypassword123"
    assert verify_password("mypassword123", hashed)
    assert not verify_password("wrongpassword", hashed)

def test_create_and_decode_token():
    token = create_access_token({"sub": "testuser", "user_id": 1})
    payload = decode_token(token)
    assert payload["sub"] == "testuser"
    assert payload["user_id"] == 1
```

**Step 2: Run tests to verify they fail**

Run: `cd backend && pytest tests/test_auth.py -v`
Expected: FAIL (imports not found)

**Step 3: Create security.py**

```python
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict, expires_minutes: int | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.access_token_expire_minutes
    )
    to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)

def create_refresh_token(data: dict) -> str:
    return create_access_token(
        data, expires_minutes=settings.refresh_token_expire_days * 1440
    )

def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None
```

**Step 4: Create auth service (re-exports from security)**

Create `backend/app/services/auth.py` that re-exports hash_password, verify_password, create_access_token, decode_token from core.security.

**Step 5: Run tests to verify they pass**

Run: `cd backend && pytest tests/test_auth.py -v`
Expected: PASS

**Step 6: Create User model**

Create `backend/app/models/user.py` with: UserBase, User (table), UserCreate, UserRead, UserUpdate schemas per design doc.

**Step 7: Write model test**

Add to `backend/tests/test_auth.py`:
```python
from app.models.user import User
from app.core.security import hash_password

def test_create_user(session):
    user = User(
        email="test@example.com",
        username="testuser",
        display_name="Test User",
        password_hash=hash_password("password123"),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    assert user.id is not None
    assert user.username == "testuser"
```

**Step 8: Run tests, commit**

Run: `cd backend && pytest tests/test_auth.py -v`
Expected: ALL PASS

Commit: `git add -A && git commit -m "feat: user model, password hashing, JWT token creation"`

---

### Task 3: Auth Endpoints (Register, Login, Refresh)

**Files:**
- Create: `backend/app/routers/auth.py`
- Create: `backend/app/core/deps.py`
- Modify: `backend/app/main.py` (add router)
- Modify: `backend/tests/test_auth.py` (add endpoint tests)

**Step 1: Write failing endpoint tests**

Add to `backend/tests/test_auth.py`:
```python
def test_register(client):
    response = client.post("/api/auth/register", json={
        "email": "new@example.com", "username": "newuser",
        "display_name": "New User", "password": "securepassword123",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "newuser"
    assert "password" not in data

def test_register_duplicate_email(client):
    payload = {"email": "dup@example.com", "username": "user1",
               "display_name": "User 1", "password": "password123"}
    client.post("/api/auth/register", json=payload)
    payload["username"] = "user2"
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 400

def test_login(client):
    client.post("/api/auth/register", json={
        "email": "login@example.com", "username": "loginuser",
        "display_name": "Login User", "password": "password123",
    })
    response = client.post("/api/auth/login", json={
        "email": "login@example.com", "password": "password123",
    })
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert "refresh_token" in response.json()

def test_login_wrong_password(client):
    client.post("/api/auth/register", json={
        "email": "wrong@example.com", "username": "wronguser",
        "display_name": "Wrong", "password": "password123",
    })
    response = client.post("/api/auth/login", json={
        "email": "wrong@example.com", "password": "badpassword",
    })
    assert response.status_code == 401

def test_refresh_token(client):
    client.post("/api/auth/register", json={
        "email": "refresh@example.com", "username": "refreshuser",
        "display_name": "Refresh", "password": "password123",
    })
    login = client.post("/api/auth/login", json={
        "email": "refresh@example.com", "password": "password123",
    })
    refresh_token = login.json()["refresh_token"]
    response = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 200
    assert "access_token" in response.json()
```

**Step 2: Run to verify failures**

Run: `cd backend && pytest tests/test_auth.py::test_register -v`
Expected: FAIL

**Step 3: Create deps.py (get_current_user dependency)**

Extracts JWT from Authorization header, decodes it, returns User from DB. Raises 401 if invalid.

**Step 4: Create auth router**

`POST /api/auth/register` — validates uniqueness, hashes password, creates user, returns UserRead.
`POST /api/auth/login` — verifies credentials, returns access + refresh tokens.
`POST /api/auth/refresh` — decodes refresh token, issues new access token.

**Step 5: Add router to main.py**

```python
from app.routers.auth import router as auth_router
app.include_router(auth_router)
```

**Step 6: Run all auth tests**

Run: `cd backend && pytest tests/test_auth.py -v`
Expected: ALL PASS

**Step 7: Commit**

`git add -A && git commit -m "feat: auth endpoints - register, login, refresh with full test coverage"`

---

### Task 4: Post Model & CRUD Endpoints

**Files:**
- Create: `backend/app/models/post.py`
- Create: `backend/app/routers/posts.py`
- Create: `backend/tests/test_posts.py`
- Modify: `backend/app/models/__init__.py`
- Modify: `backend/app/main.py`

**Step 1: Create Post model**

Post, PostCreate, PostRead schemas per design doc. PostCreate includes captcha_token field.

**Step 2: Write failing post tests**

Create `backend/tests/test_posts.py` with helper `register_and_login(client, username)`:
- `test_create_post_requires_auth` — 403 without token
- `test_create_post` — creates post with auth header (captcha_token bypass for tests)
- `test_get_global_feed` — returns posts ordered by created_at desc
- `test_get_single_post` — returns post by ID
- `test_delete_own_post` — 204 on success
- `test_delete_others_post_forbidden` — 403 when deleting another user's post

**Step 3: Implement posts router**

- `POST /api/posts` — requires auth, creates post (captcha validation added in Task 6)
- `GET /api/feed/global` — paginated global feed, excludes replies
- `GET /api/posts/{id}` — single post
- `DELETE /api/posts/{id}` — requires auth + ownership

**Step 4: Register router in main.py, update models init**

**Step 5: Run tests**

Run: `cd backend && pytest tests/test_posts.py -v`
Expected: ALL PASS

**Step 6: Commit**

`git add -A && git commit -m "feat: post model, CRUD endpoints, global feed with tests"`

---

### Task 5: Likes, Follows, Replies, Reposts & Home Feed

**Files:**
- Create: `backend/app/models/like.py`
- Create: `backend/app/models/follow.py`
- Create: `backend/app/routers/users.py`
- Create: `backend/tests/test_users.py`
- Modify: `backend/app/routers/posts.py`
- Modify: `backend/tests/test_posts.py`

**Step 1: Create Like and Follow models**

Both with unique constraints per design doc.

**Step 2: Write failing tests**

In `test_posts.py` add: test_like_post, test_unlike_post, test_reply_to_post, test_repost, test_home_feed_shows_followed_users.

In `test_users.py` add: test_get_user_profile, test_follow_user, test_unfollow_user, test_get_followers, test_update_profile.

**Step 3: Implement endpoints**

Posts router additions:
- `POST /api/posts/{id}/like` — create like (unique constraint prevents duplicates)
- `DELETE /api/posts/{id}/like` — remove like
- `POST /api/posts/{id}/reply` — create post with parent_id set
- `POST /api/posts/{id}/repost` — create post with repost_of_id set
- `GET /api/feed` — home feed: posts from followed users, paginated

Users router:
- `GET /api/users/{username}` — profile with follower/following counts
- `PUT /api/users/me` — update own profile
- `POST /api/users/{username}/follow` — create follow
- `DELETE /api/users/{username}/follow` — remove follow
- `GET /api/users/{username}/followers` — list followers
- `GET /api/users/{username}/following` — list following

**Step 4: Run all tests**

Run: `cd backend && pytest tests/ -v`
Expected: ALL PASS

**Step 5: Commit**

`git add -A && git commit -m "feat: likes, follows, replies, reposts, home feed, user profiles with tests"`

---

### Task 6: CAPTCHA System

**Files:**
- Create: `backend/app/models/captcha.py`
- Create: `backend/app/services/captcha.py`
- Create: `backend/app/routers/captcha.py`
- Create: `backend/tests/test_captcha.py`
- Modify: `backend/app/routers/posts.py` (enforce captcha_token validation)

**Step 1: Create CAPTCHA models**

CaptchaChallenge and CaptchaReview per design doc.

**Step 2: Write failing CAPTCHA service tests**

```python
import json
from app.services.captcha import generate_challenge, validate_challenge

def test_generate_draw_shape_challenge():
    challenge = generate_challenge("draw_shape")
    data = json.loads(challenge["challenge_data"])
    assert "prompt" in data

def test_validate_type_backwards_pass():
    challenge_data = json.dumps({"word": "elephant"})
    response_data = json.dumps({"text": "tnahpele"})
    result = validate_challenge("type_backwards", challenge_data, response_data)
    assert result == "passed"

def test_validate_type_backwards_fail():
    challenge_data = json.dumps({"word": "elephant"})
    response_data = json.dumps({"text": "wrong"})
    result = validate_challenge("type_backwards", challenge_data, response_data)
    assert result == "failed"

def test_validate_draw_shape_no_strokes_fails():
    challenge_data = json.dumps({"prompt": "Draw a moon", "shape": "moon"})
    response_data = json.dumps({"strokes": [], "duration_ms": 500})
    result = validate_challenge("draw_shape", challenge_data, response_data)
    assert result == "failed"

def test_validate_draw_shape_sufficient_strokes():
    strokes = [{"x": [10,20,30,40,50], "y": [10,20,30,20,10], "t": [0,100,200,300,400]}]
    challenge_data = json.dumps({"prompt": "Draw a moon", "shape": "moon"})
    response_data = json.dumps({"strokes": strokes * 3, "duration_ms": 2000})
    result = validate_challenge("draw_shape", challenge_data, response_data)
    assert result in ("passed", "pending_review")
```

**Step 3: Implement captcha service**

`generate_challenge(type)` — returns challenge dict with type + JSON params.
`validate_challenge(type, challenge_data, response_data)` — returns "passed", "failed", or "pending_review".
Drawing: checks stroke count >= 3, total points >= 10, duration > 500ms.
Typing: exact string matching.

**Step 4: Implement captcha router**

- `GET /api/captcha/challenge` — generate random challenge, store in DB, return to user
- `POST /api/captcha/submit` — validate response, issue signed captcha_token JWT if passed
- `GET /api/captcha/review-queue` — list pending_review challenges (auth required)
- `POST /api/captcha/review/{id}` — submit crowd vote, auto-resolve at 3 reviews (majority wins)

**Step 5: Update posts router to validate captcha_token**

Verify token is a valid JWT with `type: "captcha"` claim and not expired (5 min).

**Step 6: Write endpoint-level tests**

test_get_challenge_endpoint, test_submit_typing_challenge (full flow), test_post_requires_valid_captcha_token.

**Step 7: Run all tests**

Run: `cd backend && pytest tests/ -v`
Expected: ALL PASS

**Step 8: Commit**

`git add -A && git commit -m "feat: CAPTCHA system - generation, validation, crowd review, token gating"`

---

### Task 7: Media Upload Endpoint

**Files:**
- Create: `backend/app/routers/media.py`
- Modify: `backend/tests/test_posts.py`
- Modify: `backend/app/main.py`

**Step 1: Write failing tests**

```python
import io

def test_upload_media(client):
    data = register_and_login(client)
    headers = {"Authorization": f"Bearer {data['access_token']}"}
    response = client.post("/api/media/upload", headers=headers, files={
        "file": ("test.gif", io.BytesIO(b"fake gif content"), "image/gif")
    })
    assert response.status_code == 201
    assert "url" in response.json()

def test_upload_too_large(client):
    data = register_and_login(client)
    headers = {"Authorization": f"Bearer {data['access_token']}"}
    response = client.post("/api/media/upload", headers=headers, files={
        "file": ("big.gif", io.BytesIO(b"x" * (6 * 1024 * 1024)), "image/gif")
    })
    assert response.status_code == 413
```

**Step 2: Implement media router**

`POST /api/media/upload` — validates file type + size, saves to upload_dir with UUID filename, returns URL.
`GET /api/media/{filename}` — serves file from upload_dir.

Allowed types: image/gif, image/png, image/jpeg (5MB), video/mp4, video/webm (10MB).

**Step 3: Run tests, commit**

Run: `cd backend && pytest tests/ -v`
Expected: ALL PASS

Commit: `git add -A && git commit -m "feat: media upload/serve with type and size validation"`

---

### Task 8: Docker Setup

**Files:**
- Create: `backend/Dockerfile`
- Create: `docker-compose.yml`
- Create: `backend/.env.example`

**Step 1: Create Dockerfile**

Python 3.12-slim, install deps, copy app, create /data and /uploads dirs, run uvicorn on port 8000.

**Step 2: Create docker-compose.yml**

Single backend service with db_data and uploads volumes. Environment vars for DATABASE_URL, JWT_SECRET, ALLOWED_ORIGINS, UPLOAD_DIR.

**Step 3: Create .env.example documenting all env vars**

**Step 4: Build and verify**

Run: `docker compose build && docker compose up -d`
Run: `curl http://localhost:8000/api/health`
Expected: `{"status": "ok"}`

**Step 5: Commit**

`git add -A && git commit -m "feat: Docker setup for backend"`

---

## Phase 2: Frontend

### Task 9: Next.js Project Scaffolding

**Files:**
- Create: `frontend/` via create-next-app
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/auth.tsx`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/test-setup.ts`

**Step 1: Scaffold project**

Run: `npx create-next-app@latest frontend --typescript --tailwind --app --src-dir --no-eslint --import-alias "@/*"`

**Step 2: Install test deps**

Run: `cd frontend && npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitejs/plugin-react jsdom msw`

**Step 3: Create vitest.config.ts and test-setup.ts**

**Step 4: Create API client** (`frontend/src/lib/api.ts`)

ApiClient class with methods for all backend endpoints. Uses fetch with JWT Authorization header. Handles token storage and Content-Type headers.

**Step 5: Create auth context** (`frontend/src/lib/auth.tsx`)

React context providing: user, login(), logout(), register(). Persists JWT to localStorage. Wraps children with AuthProvider.

**Step 6: Write basic test**

```typescript
import { describe, it, expect } from 'vitest'
import { api } from '@/lib/api'

describe('ApiClient', () => {
  it('has all required methods', () => {
    expect(api.login).toBeDefined()
    expect(api.register).toBeDefined()
    expect(api.getGlobalFeed).toBeDefined()
    expect(api.createPost).toBeDefined()
  })
})
```

**Step 7: Run test, commit**

Run: `cd frontend && npx vitest run`
Expected: PASS

Commit: `git add -A && git commit -m "feat: Next.js scaffold with API client, auth context, vitest"`

---

### Task 10: Tailwind Theme & Layout Component

**Files:**
- Modify: `frontend/tailwind.config.ts`
- Create: `frontend/src/components/Layout.tsx`
- Create: `frontend/src/components/Sidebar.tsx`
- Create: `frontend/src/components/RightSidebar.tsx`
- Modify: `frontend/src/app/layout.tsx`

**Step 1: Add custom colors to Tailwind config**

brand (#FF8C42), brand-light (#FFF0E0), brand-dark (#E67A30), surface (#FAFAFA), surface-card (#FFFFFF), surface-border (#E5E5E5), ink (#1A1A1A), ink-light (#6B7280).

**Step 2: Build Layout (three-column responsive grid)**

Left sidebar, center content, right sidebar. Collapses to single column on mobile.

**Step 3: Build Sidebar** — Home, Explore, Review Queue, Profile nav links + orange Post button.

**Step 4: Build RightSidebar** — "Who to follow" and trending (placeholder).

**Step 5: Write component test**

```typescript
describe('Sidebar', () => {
  it('renders navigation links', () => {
    render(<Sidebar />)
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Explore')).toBeInTheDocument()
    expect(screen.getByText('Review')).toBeInTheDocument()
  })
})
```

**Step 6: Run tests, commit**

Run: `cd frontend && npx vitest run`
Commit: `git add -A && git commit -m "feat: light theme, three-column layout, sidebar navigation"`

---

### Task 11: PostCard Component

**Files:**
- Create: `frontend/src/components/PostCard.tsx`
- Create: `frontend/src/__tests__/components/PostCard.test.tsx`

**Step 1: Write failing test**

Test rendering of content, author, like/reply/repost counts, and click handlers.

**Step 2: Implement PostCard**

Avatar, display name, @username, relative timestamp, content text, inline media (image/GIF/video), action bar with like/reply/repost buttons. White card with shadow, orange accent on hover.

**Step 3: Run tests, commit**

Commit: `git add -A && git commit -m "feat: PostCard component with like/reply/repost actions"`

---

### Task 12: CaptchaModal Component

**Files:**
- Create: `frontend/src/components/CaptchaModal.tsx`
- Create: `frontend/src/components/DrawingCanvas.tsx`
- Create: `frontend/src/components/TypingChallenge.tsx`
- Create: `frontend/src/__tests__/components/CaptchaModal.test.tsx`

**Step 1: Write failing tests**

Test that draw_shape shows canvas, type_backwards shows text input, 2:00 timer displays.

**Step 2: Implement DrawingCanvas**

HTML canvas capturing mouse/trackpad strokes. Records `{strokes: [{x:[], y:[], t:[]}], duration_ms}`. Clear and undo buttons.

**Step 3: Implement TypingChallenge**

Text input for backwards/pattern/speed challenges with prompt display.

**Step 4: Implement CaptchaModal**

Full-screen overlay. Shows challenge prompt, 2-minute countdown, appropriate input (canvas or text), submit button. Playful copy. Calls onComplete(captcha_token) on success.

**Step 5: Run tests, commit**

Commit: `git add -A && git commit -m "feat: CaptchaModal with drawing canvas and typing challenges"`

---

### Task 13: ComposeBox Component

**Files:**
- Create: `frontend/src/components/ComposeBox.tsx`
- Create: `frontend/src/__tests__/components/ComposeBox.test.tsx`

**Step 1: Write failing tests**

Test textarea renders, post button exists, CAPTCHA modal triggers on submit, media upload button exists.

**Step 2: Implement ComposeBox**

Textarea + media upload button + character count + orange Post button. On submit: fetch CAPTCHA challenge, open CaptchaModal, on success create post via API.

**Step 3: Run tests, commit**

Commit: `git add -A && git commit -m "feat: ComposeBox with media upload and CAPTCHA integration"`

---

### Task 14: Feed Pages (Home & Explore)

**Files:**
- Modify: `frontend/src/app/page.tsx`
- Create: `frontend/src/app/explore/page.tsx`
- Create: `frontend/src/__tests__/pages/Feed.test.tsx`

**Step 1: Write tests with MSW mocks**

Test that posts render from API, compose box appears at top.

**Step 2: Implement Home page** (GET /api/feed) and **Explore page** (GET /api/feed/global)

Both use Layout, ComposeBox at top, list of PostCards. "Load more" button for pagination.

**Step 3: Run tests, commit**

Commit: `git add -A && git commit -m "feat: home feed and explore pages"`

---

### Task 15: Auth Pages (Login & Register)

**Files:**
- Create: `frontend/src/app/login/page.tsx`
- Create: `frontend/src/app/register/page.tsx`
- Create: `frontend/src/__tests__/pages/Auth.test.tsx`

**Step 1: Write tests**

Login: renders email/password fields + submit button. Register: renders all fields + triggers CAPTCHA after submit.

**Step 2: Implement login page** — form, API call, store token, redirect to home.

**Step 3: Implement register page** — form + CAPTCHA challenge on submit.

**Step 4: Run tests, commit**

Commit: `git add -A && git commit -m "feat: login and register pages with CAPTCHA on signup"`

---

### Task 16: Profile Page

**Files:**
- Create: `frontend/src/app/[username]/page.tsx`
- Create: `frontend/src/components/UserCard.tsx`
- Create: `frontend/src/__tests__/pages/Profile.test.tsx`

**Step 1: Write tests**

Shows user info, posts, follow/unfollow button, follower/following counts.

**Step 2: Implement profile page and UserCard component**

**Step 3: Run tests, commit**

Commit: `git add -A && git commit -m "feat: profile page with follow/unfollow"`

---

### Task 17: Post Detail Page (Thread View)

**Files:**
- Create: `frontend/src/app/post/[id]/page.tsx`
- Create: `frontend/src/__tests__/pages/PostDetail.test.tsx`

**Step 1: Write tests** — shows post + replies + reply compose box.

**Step 2: Implement post detail with threaded replies**

**Step 3: Run tests, commit**

Commit: `git add -A && git commit -m "feat: post detail page with threaded replies"`

---

### Task 18: CAPTCHA Review Queue Page

**Files:**
- Create: `frontend/src/app/review/page.tsx`
- Create: `frontend/src/components/ReviewCard.tsx`
- Create: `frontend/src/__tests__/pages/Review.test.tsx`

**Step 1: Write tests** — shows pending challenges, approve/reject buttons.

**Step 2: Implement ReviewCard** — displays challenge prompt + submitted drawing/text + approve/reject.

**Step 3: Implement Review Queue page**

**Step 4: Run tests, commit**

Commit: `git add -A && git commit -m "feat: CAPTCHA review queue page"`

---

## Phase 3: Integration & Deployment

### Task 19: Next.js API Proxy Routes

**Files:**
- Create: `frontend/src/app/api/[...path]/route.ts`
- Create: `frontend/.env.local`

**Step 1: Create catch-all proxy route**

Forwards GET/POST/PUT/DELETE requests to BACKEND_URL, passes Authorization header through.

**Step 2: Create .env.local**

```
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=
```

When NEXT_PUBLIC_API_URL is empty, frontend calls its own /api/* routes which proxy to backend.

**Step 3: Test locally** — docker compose up + npm run dev, verify API works through proxy.

**Step 4: Commit**

`git add -A && git commit -m "feat: Next.js API proxy routes"`

---

### Task 20: Vercel Deployment Config

**Files:**
- Create: `frontend/vercel.json`

**Step 1: Create vercel.json** with framework and build settings.

**Step 2: Document Vercel env vars** — BACKEND_URL must point to your Docker server.

**Step 3: Commit**

`git add -A && git commit -m "feat: Vercel deployment config"`

---

### Task 21: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

**Step 1: Create CI workflow**

Two jobs: backend-tests (Python 3.12, pytest) and frontend-tests (Node 20, vitest). Both triggered on push and pull_request.

**Step 2: Commit**

`git add -A && git commit -m "feat: GitHub Actions CI"`

---

### Task 22: End-to-End Smoke Test

**Files:**
- Create: `backend/tests/test_e2e.py`

**Step 1: Write full-flow test**

Register, login, get CAPTCHA challenge, solve it, create post with token, verify post appears in global feed.

**Step 2: Run**

Run: `cd backend && pytest tests/test_e2e.py -v`
Expected: PASS

**Step 3: Commit**

`git add -A && git commit -m "feat: end-to-end smoke test for full post flow"`
