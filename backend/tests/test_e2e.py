import json


def test_full_post_flow(client):
    """Register -> Login -> Get CAPTCHA -> Solve -> Post -> Verify in feed"""
    # Register
    client.post("/api/auth/register", json={
        "email": "e2e@example.com",
        "username": "e2euser",
        "display_name": "E2E User",
        "password": "password123",
    })
    # Login
    login = client.post("/api/auth/login", json={
        "email": "e2e@example.com",
        "password": "password123",
    })
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    # Get challenge
    challenge = client.get(
        "/api/captcha/challenge?type=type_backwards", headers=headers
    ).json()
    word = json.loads(challenge["data"])["word"]

    # Solve challenge
    submit = client.post("/api/captcha/submit", json={
        "challenge_id": challenge["challenge_id"],
        "response": json.dumps({"text": word[::-1]}),
    }, headers=headers)
    assert submit.status_code == 200
    captcha_token = submit.json()["captcha_token"]

    # Create post
    post = client.post("/api/posts", json={
        "content": "My first human-verified post!",
        "captcha_token": captcha_token,
    }, headers=headers)
    assert post.status_code == 201

    # Verify in global feed
    feed = client.get("/api/feed/global")
    assert any(p["content"] == "My first human-verified post!" for p in feed.json())


def test_full_reply_flow(client):
    """Register -> Post -> Reply with CAPTCHA -> Verify reply"""
    client.post("/api/auth/register", json={
        "email": "reply@example.com",
        "username": "replyuser",
        "display_name": "Reply User",
        "password": "password123",
    })
    login = client.post("/api/auth/login", json={
        "email": "reply@example.com",
        "password": "password123",
    })
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    # Create original post
    post = client.post("/api/posts", json={
        "content": "Original post",
        "captcha_token": "test-bypass",
    }, headers=headers).json()

    # Get captcha for reply
    challenge = client.get(
        "/api/captcha/challenge?type=type_backwards", headers=headers
    ).json()
    word = json.loads(challenge["data"])["word"]
    submit = client.post("/api/captcha/submit", json={
        "challenge_id": challenge["challenge_id"],
        "response": json.dumps({"text": word[::-1]}),
    }, headers=headers)
    captcha_token = submit.json()["captcha_token"]

    # Reply
    reply = client.post(f"/api/posts/{post['id']}/reply", json={
        "content": "A thoughtful reply",
        "captcha_token": captcha_token,
    }, headers=headers)
    assert reply.status_code == 201
    assert reply.json()["parent_id"] == post["id"]
