import json

from app.services.captcha import generate_challenge, validate_challenge, create_captcha_token, verify_captcha_token


# Unit tests for captcha service
def test_generate_draw_shape_challenge():
    challenge = generate_challenge("draw_shape")
    data = json.loads(challenge["challenge_data"])
    assert "prompt" in data
    assert "shape" in data
    assert challenge["challenge_type"] == "draw_shape"


def test_generate_type_backwards_challenge():
    challenge = generate_challenge("type_backwards")
    data = json.loads(challenge["challenge_data"])
    assert "word" in data
    assert challenge["challenge_type"] == "type_backwards"


def test_generate_random_challenge():
    challenge = generate_challenge(None)
    assert challenge["challenge_type"] in [
        "draw_shape", "draw_freeform", "type_backwards", "type_pattern", "speed_type"
    ]


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


def test_validate_type_pattern_pass():
    challenge_data = json.dumps({"word": "hello", "pattern": "alternating_caps"})
    response_data = json.dumps({"text": "hElLo"})
    result = validate_challenge("type_pattern", challenge_data, response_data)
    assert result == "passed"


def test_validate_type_pattern_fail():
    challenge_data = json.dumps({"word": "hello", "pattern": "alternating_caps"})
    response_data = json.dumps({"text": "HELLO"})
    result = validate_challenge("type_pattern", challenge_data, response_data)
    assert result == "failed"


def test_validate_speed_type_pass():
    challenge_data = json.dumps({"phrase": "hello world", "time_limit_ms": 5000})
    response_data = json.dumps({"text": "hello world", "duration_ms": 3000})
    result = validate_challenge("speed_type", challenge_data, response_data)
    assert result == "passed"


def test_validate_speed_type_too_slow():
    challenge_data = json.dumps({"phrase": "hello world", "time_limit_ms": 5000})
    response_data = json.dumps({"text": "hello world", "duration_ms": 6000})
    result = validate_challenge("speed_type", challenge_data, response_data)
    assert result == "failed"


def test_validate_draw_shape_no_strokes():
    challenge_data = json.dumps({"prompt": "Draw a moon", "shape": "moon"})
    response_data = json.dumps({"strokes": [], "duration_ms": 500})
    result = validate_challenge("draw_shape", challenge_data, response_data)
    assert result == "failed"


def test_validate_draw_shape_sufficient_strokes():
    strokes = [
        {"x": [10, 20, 30, 40, 50], "y": [10, 20, 30, 20, 10], "t": [0, 100, 200, 300, 400]}
    ]
    challenge_data = json.dumps({"prompt": "Draw a moon", "shape": "moon"})
    response_data = json.dumps({"strokes": strokes * 3, "duration_ms": 2000})
    result = validate_challenge("draw_shape", challenge_data, response_data)
    assert result in ("passed", "pending_review")


def test_validate_draw_shape_few_strokes_pending():
    strokes = [
        {"x": [10, 20], "y": [10, 20], "t": [0, 100]}
    ]
    challenge_data = json.dumps({"prompt": "Draw a moon", "shape": "moon"})
    response_data = json.dumps({"strokes": strokes, "duration_ms": 300})
    result = validate_challenge("draw_shape", challenge_data, response_data)
    assert result in ("pending_review", "failed")


def test_captcha_token_roundtrip():
    token = create_captcha_token(42)
    payload = verify_captcha_token(token)
    assert payload is not None
    assert payload["type"] == "captcha"
    assert payload["user_id"] == 42


def test_verify_bad_captcha_token():
    result = verify_captcha_token("invalid.token.here")
    assert result is None


# Endpoint tests
def register_and_login(client, username="captchauser"):
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


def test_get_challenge_endpoint(client):
    data = register_and_login(client)
    headers = auth_headers(data)
    response = client.get("/api/captcha/challenge", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert "challenge_id" in body
    assert "type" in body
    assert "data" in body


def test_get_challenge_with_specific_type(client):
    data = register_and_login(client)
    headers = auth_headers(data)
    response = client.get("/api/captcha/challenge?type=type_backwards", headers=headers)
    assert response.status_code == 200
    assert response.json()["type"] == "type_backwards"


def test_submit_typing_challenge_pass(client):
    data = register_and_login(client)
    headers = auth_headers(data)
    challenge = client.get("/api/captcha/challenge?type=type_backwards", headers=headers).json()
    word = json.loads(challenge["data"])["word"]
    response = client.post("/api/captcha/submit", json={
        "challenge_id": challenge["challenge_id"],
        "response": json.dumps({"text": word[::-1]}),
    }, headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "passed"
    assert "captcha_token" in response.json()


def test_submit_typing_challenge_fail(client):
    data = register_and_login(client)
    headers = auth_headers(data)
    challenge = client.get("/api/captcha/challenge?type=type_backwards", headers=headers).json()
    response = client.post("/api/captcha/submit", json={
        "challenge_id": challenge["challenge_id"],
        "response": json.dumps({"text": "wronganswer"}),
    }, headers=headers)
    assert response.status_code == 400
    assert response.json()["detail"] == "failed"


def test_review_queue_empty(client):
    data = register_and_login(client)
    headers = auth_headers(data)
    response = client.get("/api/captcha/review-queue", headers=headers)
    assert response.status_code == 200
    assert response.json() == []
