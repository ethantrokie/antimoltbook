def register_and_login(client, username="testuser"):
    client.post("/api/auth/register", json={
        "email": f"{username}@example.com",
        "username": username,
        "display_name": username.title(),
        "password": "password123",
    })
    res = client.post("/api/auth/login", json={
        "email": f"{username}@example.com",
        "password": "password123",
    })
    return res.json()


def auth_headers(data):
    return {"Authorization": f"Bearer {data['access_token']}"}


def test_create_post_requires_auth(client):
    response = client.post("/api/posts", json={"content": "hello", "captcha_token": "fake"})
    assert response.status_code == 403


def test_create_post(client):
    data = register_and_login(client)
    headers = auth_headers(data)
    response = client.post("/api/posts", json={
        "content": "Hello world!",
        "captcha_token": "test-bypass",
    }, headers=headers)
    assert response.status_code == 201
    assert response.json()["content"] == "Hello world!"


def test_get_global_feed(client):
    data = register_and_login(client)
    headers = auth_headers(data)
    client.post("/api/posts", json={"content": "Post 1", "captcha_token": "test-bypass"}, headers=headers)
    client.post("/api/posts", json={"content": "Post 2", "captcha_token": "test-bypass"}, headers=headers)
    response = client.get("/api/feed/global")
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_get_single_post(client):
    data = register_and_login(client)
    headers = auth_headers(data)
    create_res = client.post("/api/posts", json={"content": "Single post", "captcha_token": "test-bypass"}, headers=headers)
    post_id = create_res.json()["id"]
    response = client.get(f"/api/posts/{post_id}")
    assert response.status_code == 200
    assert response.json()["content"] == "Single post"


def test_delete_own_post(client):
    data = register_and_login(client)
    headers = auth_headers(data)
    create_res = client.post("/api/posts", json={"content": "To delete", "captcha_token": "test-bypass"}, headers=headers)
    post_id = create_res.json()["id"]
    response = client.delete(f"/api/posts/{post_id}", headers=headers)
    assert response.status_code == 204


def test_delete_others_post_forbidden(client):
    data1 = register_and_login(client, "user1")
    data2 = register_and_login(client, "user2")
    headers1 = auth_headers(data1)
    headers2 = auth_headers(data2)
    create_res = client.post("/api/posts", json={"content": "Not yours", "captcha_token": "test-bypass"}, headers=headers1)
    post_id = create_res.json()["id"]
    response = client.delete(f"/api/posts/{post_id}", headers=headers2)
    assert response.status_code == 403


def test_like_post(client):
    data = register_and_login(client)
    headers = auth_headers(data)
    post = client.post("/api/posts", json={"content": "Likeable", "captcha_token": "test-bypass"}, headers=headers).json()
    response = client.post(f"/api/posts/{post['id']}/like", headers=headers)
    assert response.status_code == 201


def test_unlike_post(client):
    data = register_and_login(client)
    headers = auth_headers(data)
    post = client.post("/api/posts", json={"content": "Unlikeable", "captcha_token": "test-bypass"}, headers=headers).json()
    client.post(f"/api/posts/{post['id']}/like", headers=headers)
    response = client.delete(f"/api/posts/{post['id']}/like", headers=headers)
    assert response.status_code == 204


def test_reply_to_post(client):
    data = register_and_login(client)
    headers = auth_headers(data)
    post = client.post("/api/posts", json={"content": "Parent", "captcha_token": "test-bypass"}, headers=headers).json()
    response = client.post(f"/api/posts/{post['id']}/reply", json={
        "content": "A reply", "captcha_token": "test-bypass"
    }, headers=headers)
    assert response.status_code == 201
    assert response.json()["parent_id"] == post["id"]


def test_repost(client):
    data = register_and_login(client)
    headers = auth_headers(data)
    post = client.post("/api/posts", json={"content": "Original", "captcha_token": "test-bypass"}, headers=headers).json()
    response = client.post(f"/api/posts/{post['id']}/repost", json={
        "captcha_token": "test-bypass"
    }, headers=headers)
    assert response.status_code == 201
    assert response.json()["repost_of_id"] == post["id"]


def test_home_feed_shows_followed_users(client):
    data1 = register_and_login(client, "poster")
    data2 = register_and_login(client, "follower")
    headers1 = auth_headers(data1)
    headers2 = auth_headers(data2)
    client.post("/api/posts", json={"content": "From poster", "captcha_token": "test-bypass"}, headers=headers1)
    client.post("/api/users/poster/follow", headers=headers2)
    response = client.get("/api/feed", headers=headers2)
    assert response.status_code == 200
    posts = response.json()
    assert len(posts) == 1
    assert posts[0]["content"] == "From poster"
