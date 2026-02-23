import io


def register_and_login(client, username="mediauser"):
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


def test_upload_media(client):
    data = register_and_login(client)
    headers = auth_headers(data)
    file_content = b"fake gif content"
    response = client.post("/api/media/upload", headers=headers, files={
        "file": ("test.gif", io.BytesIO(file_content), "image/gif")
    })
    assert response.status_code == 201
    body = response.json()
    assert "url" in body
    assert body["media_type"] == "gif"


def test_upload_too_large(client):
    data = register_and_login(client)
    headers = auth_headers(data)
    file_content = b"x" * (6 * 1024 * 1024)  # 6MB, over 5MB limit
    response = client.post("/api/media/upload", headers=headers, files={
        "file": ("big.gif", io.BytesIO(file_content), "image/gif")
    })
    assert response.status_code == 413


def test_upload_unsupported_type(client):
    data = register_and_login(client)
    headers = auth_headers(data)
    response = client.post("/api/media/upload", headers=headers, files={
        "file": ("test.exe", io.BytesIO(b"bad content"), "application/octet-stream")
    })
    assert response.status_code == 400


def test_upload_requires_auth(client):
    response = client.post("/api/media/upload", files={
        "file": ("test.gif", io.BytesIO(b"content"), "image/gif")
    })
    assert response.status_code == 403
