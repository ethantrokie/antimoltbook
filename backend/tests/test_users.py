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


def test_get_user_profile(client):
    register_and_login(client, "profileuser")
    response = client.get("/api/users/profileuser")
    assert response.status_code == 200
    assert response.json()["username"] == "profileuser"


def test_follow_user(client):
    register_and_login(client, "target")
    data = register_and_login(client, "follower")
    headers = auth_headers(data)
    response = client.post("/api/users/target/follow", headers=headers)
    assert response.status_code == 201


def test_unfollow_user(client):
    register_and_login(client, "target2")
    data = register_and_login(client, "follower2")
    headers = auth_headers(data)
    client.post("/api/users/target2/follow", headers=headers)
    response = client.delete("/api/users/target2/follow", headers=headers)
    assert response.status_code == 204


def test_get_followers(client):
    register_and_login(client, "popular")
    data = register_and_login(client, "fan")
    headers = auth_headers(data)
    client.post("/api/users/popular/follow", headers=headers)
    response = client.get("/api/users/popular/followers")
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_get_following(client):
    register_and_login(client, "target3")
    data = register_and_login(client, "follower3")
    headers = auth_headers(data)
    client.post("/api/users/target3/follow", headers=headers)
    response = client.get("/api/users/follower3/following")
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_update_profile(client):
    data = register_and_login(client, "updater")
    headers = auth_headers(data)
    response = client.put("/api/users/me", json={
        "display_name": "Updated Name",
        "bio": "Hello world",
    }, headers=headers)
    assert response.status_code == 200
    assert response.json()["display_name"] == "Updated Name"
    assert response.json()["bio"] == "Hello world"


def test_cannot_follow_self(client):
    data = register_and_login(client, "narcissist")
    headers = auth_headers(data)
    response = client.post("/api/users/narcissist/follow", headers=headers)
    assert response.status_code == 400
