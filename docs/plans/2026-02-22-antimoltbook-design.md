# AntiMoltbook — Design Document

## Overview

AntiMoltbook is a social media platform (X/Twitter clone) that gates sign-up and every post behind creative "silly CAPTCHAs" — drawing challenges, typing tricks — designed to stop AI agents from accessing and posting on the platform. No external APIs are used.

## Architecture

```
┌─ Vercel (free) ──────────┐     ┌─ Docker (your server) ─────┐
│                           │     │                             │
│  Next.js Frontend (:443)  │────▶│  FastAPI Backend (:8000)    │
│  + API proxy routes       │     │  SQLite (WAL) + /uploads    │
│                           │     │                             │
└───────────────────────────┘     └─────────────────────────────┘
```

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS, hosted on Vercel (free Hobby tier)
- **Backend**: FastAPI + SQLModel + SQLite (WAL mode), runs in a single Docker container
- **Media Storage**: Local filesystem via Docker volume, 5MB GIF / 10MB video limits
- **Auth**: Email + password with JWT (access + refresh tokens)
- **Scale target**: <1000 users

## Visual Identity

- **Theme**: Light mode (anti-X)
- **Background**: `#FAFAFA` (white)
- **Text**: `#1A1A1A` (charcoal)
- **Accent**: `#FF8C42` (warm orange)
- **Secondary**: `#FFF0E0` (peach)
- **Borders**: `#E5E5E5` (light gray)
- **Cards**: `#FFFFFF` with subtle shadow

## Data Model

### users
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | auto-increment |
| email | TEXT UNIQUE | |
| username | TEXT UNIQUE | |
| display_name | TEXT | |
| bio | TEXT | nullable |
| avatar_url | TEXT | nullable |
| password_hash | TEXT | bcrypt |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### posts
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | auto-increment |
| user_id | INTEGER FK | references users.id |
| content | TEXT | nullable (reposts may have no content) |
| media_url | TEXT | nullable |
| media_type | TEXT | null, "image", "gif", "video" |
| parent_id | INTEGER FK | nullable, self-ref for replies |
| repost_of_id | INTEGER FK | nullable, self-ref for reposts |
| created_at | DATETIME | |

### likes
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | auto-increment |
| user_id | INTEGER FK | references users.id |
| post_id | INTEGER FK | references posts.id |
| created_at | DATETIME | |
| | UNIQUE | (user_id, post_id) |

### follows
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | auto-increment |
| follower_id | INTEGER FK | references users.id |
| following_id | INTEGER FK | references users.id |
| created_at | DATETIME | |
| | UNIQUE | (follower_id, following_id) |

### captcha_challenges
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | auto-increment |
| user_id | INTEGER FK | references users.id |
| challenge_type | TEXT | "draw_shape", "draw_freeform", "type_backwards", "type_pattern", "speed_type" |
| challenge_data | TEXT (JSON) | challenge parameters |
| response_data | TEXT (JSON) | user's response, nullable |
| server_passed | BOOLEAN | nullable |
| crowd_status | TEXT | "not_needed", "pending_review", "approved", "rejected" |
| context | TEXT | "signup" or "post" |
| created_at | DATETIME | |

### captcha_reviews
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | auto-increment |
| challenge_id | INTEGER FK | references captcha_challenges.id |
| reviewer_id | INTEGER FK | references users.id |
| approved | BOOLEAN | |
| created_at | DATETIME | |

## CAPTCHA System

### Challenge Types

| Type | Challenge | Server Validation |
|------|-----------|-------------------|
| draw_shape | "Draw a moon/star/circle" | Stroke count > N, covers expected region |
| draw_freeform | "Draw your best cat" | Sufficient stroke complexity |
| type_backwards | "Type 'elephant' backwards" | Exact string match |
| type_pattern | "Type every other letter in CAPS: 'hello'" | Exact string match |
| speed_type | "Type this sentence in under 5 seconds" | Correctness + timestamp check |

### Validation Flow

1. User requests a challenge → server returns random challenge type + params
2. User completes challenge in UI (canvas drawing or text input)
3. User submits response → server validates
4. **PASS** → server issues a short-lived captcha_token (5 min expiry)
5. **FAIL/UNCERTAIN** → challenge enters crowd review queue (crowd_status = "pending_review")
6. 3 other users review → majority of 2+ decides approve/reject
7. On approve → token issued; on reject → user can retry

### Why This Stops AI Agents

- Drawing requires physical trackpad/mouse input with natural stroke patterns
- Stroke timing data captured (time between strokes)
- No external API = no CAPTCHA-solving service to call
- Challenge set expandable over time

## API Endpoints

### Auth
- `POST /api/auth/register` — create account + initial CAPTCHA
- `POST /api/auth/login` — returns JWT access + refresh tokens
- `POST /api/auth/refresh` — refresh expired access token

### Users
- `GET /api/users/{username}` — get profile
- `PUT /api/users/me` — update own profile
- `POST /api/users/{username}/follow` — follow
- `DELETE /api/users/{username}/follow` — unfollow
- `GET /api/users/{username}/followers` — list followers
- `GET /api/users/{username}/following` — list following

### Posts
- `GET /api/feed` — home feed (followed users), paginated
- `GET /api/feed/global` — global feed, paginated
- `POST /api/posts` — create post (requires captcha_token)
- `GET /api/posts/{id}` — single post with reply thread
- `DELETE /api/posts/{id}` — delete own post
- `POST /api/posts/{id}/like` — like
- `DELETE /api/posts/{id}/like` — unlike
- `POST /api/posts/{id}/repost` — repost (requires captcha_token)
- `POST /api/posts/{id}/reply` — reply (requires captcha_token)

### CAPTCHA
- `GET /api/captcha/challenge` — get random challenge
- `POST /api/captcha/submit` — submit response, returns pass/fail/pending
- `GET /api/captcha/review-queue` — get pending challenges for crowd review
- `POST /api/captcha/review/{challenge_id}` — submit crowd review vote

### Media
- `POST /api/media/upload` — upload file, returns URL (5MB GIF / 10MB video)
- `GET /api/media/{filename}` — serve uploaded file

### Post Creation Flow
1. `GET /api/captcha/challenge` → `{ challenge_id, type, data }`
2. User completes challenge in UI
3. `POST /api/captcha/submit` → `{ challenge_id, response }` → `{ status, token }`
4. `POST /api/posts` → `{ content, media_url, captcha_token }`

## Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home Feed | Posts from followed users |
| `/explore` | Global Feed | All posts, searchable |
| `/review` | CAPTCHA Review Queue | Crowd-review pending challenges |
| `/{username}` | Profile | User's posts, stats, bio |
| `/post/{id}` | Post Detail | Single post with reply thread |
| `/login` | Login | Email + password |
| `/register` | Register | Sign-up + initial CAPTCHA |

### Layout

Three-column layout (left sidebar, main feed, right sidebar):
- **Left sidebar**: Navigation (Home, Explore, Review Queue, Profile, Post button)
- **Main feed**: Content area (posts, threads, forms)
- **Right sidebar**: Trending, Who to follow suggestions

### Key Components

- **PostCard** — post content, inline media, like/reply/repost buttons
- **CaptchaModal** — full-screen modal with canvas or text input, 2-min timer
- **ComposeBox** — text input + media upload, triggers CaptchaModal on submit
- **ReviewCard** — challenge submission + Approve/Reject buttons
- **UserCard** — avatar, names, follow button
- **MediaPlayer** — inline video/GIF player

## Testing Strategy

### Backend (pytest)

| Layer | Tool | Scope |
|-------|------|-------|
| Unit tests | pytest + pytest-asyncio | CAPTCHA validation, token gen, password hashing |
| API tests | pytest + httpx TestClient | Every endpoint: happy path, auth guard, validation errors |
| Database tests | pytest + in-memory SQLite | Models, relationships, constraints, queries |

### Frontend (Vitest + React Testing Library)

| Layer | Tool | Scope |
|-------|------|-------|
| Component tests | Vitest + RTL | Render, interactions, conditional rendering |
| Canvas/CAPTCHA tests | Vitest + mock canvas | Modal flow, timer, stroke capture, submission |
| API integration tests | Vitest + MSW | API calls, loading/error/success states, auth tokens |

### Testing Rules

- Every endpoint: 1 happy-path, 1 auth-required, 1 validation-error test minimum
- Every component: 1 render, 1 interaction test minimum
- CAPTCHA system: heavy coverage — each challenge type has its own test suite
- In-memory SQLite for backend tests
- Tests run in GitHub Actions CI on every push

## Docker & Deployment

### Backend Container
- Python 3.12-slim base
- FastAPI + Uvicorn + SQLModel
- Volumes: `/data` (SQLite), `/uploads` (media)
- Port: 8000

### Docker Compose
```yaml
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - db_data:/data
      - uploads:/uploads
    environment:
      - JWT_SECRET=<generated>
      - ALLOWED_ORIGINS=https://antimoltbook.vercel.app
```

### Deployment Flow
- **Frontend**: `git push` → Vercel auto-deploys
- **Backend**: `docker compose up -d` on any server
- Next.js API routes proxy `/api/*` to backend URL (env var)

## Project Structure

```
antimoltbook/
├── frontend/
│   ├── src/
│   │   ├── app/                  # Next.js App Router pages
│   │   ├── components/           # React components
│   │   ├── lib/                  # API client, auth helpers, utils
│   │   └── __tests__/            # Frontend tests
│   ├── vitest.config.ts
│   ├── tailwind.config.ts
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI app entry
│   │   ├── models/               # SQLModel models
│   │   ├── routers/              # API route handlers
│   │   ├── services/             # Business logic (captcha, auth)
│   │   └── core/                 # Config, security, database
│   ├── tests/
│   │   ├── conftest.py           # Shared fixtures
│   │   ├── test_auth.py
│   │   ├── test_posts.py
│   │   ├── test_captcha.py
│   │   └── test_users.py
│   ├── Dockerfile
│   └── requirements.txt
├── docker-compose.yml
└── docs/
    └── plans/
```
