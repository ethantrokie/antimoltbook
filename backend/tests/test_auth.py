from app.services.auth import hash_password, verify_password, create_access_token, decode_token
from app.models.user import User


# Unit tests
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


# Endpoint tests
def test_register(client):
    response = client.post("/api/auth/register", json={
        "email": "new@example.com",
        "username": "newuser",
        "display_name": "New User",
        "password": "securepassword123",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "newuser"
    assert "password" not in data
    assert "password_hash" not in data


def test_register_duplicate_email(client):
    payload = {
        "email": "dup@example.com",
        "username": "user1",
        "display_name": "User 1",
        "password": "password123",
    }
    client.post("/api/auth/register", json=payload)
    payload["username"] = "user2"
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 400


def test_login(client):
    client.post("/api/auth/register", json={
        "email": "login@example.com",
        "username": "loginuser",
        "display_name": "Login User",
        "password": "password123",
    })
    response = client.post("/api/auth/login", json={
        "email": "login@example.com",
        "password": "password123",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


def test_login_wrong_password(client):
    client.post("/api/auth/register", json={
        "email": "wrong@example.com",
        "username": "wronguser",
        "display_name": "Wrong",
        "password": "password123",
    })
    response = client.post("/api/auth/login", json={
        "email": "wrong@example.com",
        "password": "badpassword",
    })
    assert response.status_code == 401


def test_refresh_token(client):
    client.post("/api/auth/register", json={
        "email": "refresh@example.com",
        "username": "refreshuser",
        "display_name": "Refresh",
        "password": "password123",
    })
    login = client.post("/api/auth/login", json={
        "email": "refresh@example.com",
        "password": "password123",
    })
    refresh_token = login.json()["refresh_token"]
    response = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 200
    assert "access_token" in response.json()
