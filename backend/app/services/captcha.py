import json
import random

from app.core.config import settings
from app.core.security import create_access_token, decode_token


def generate_challenge(challenge_type: str | None = None) -> dict:
    """Generate a CAPTCHA challenge of the given type (or random if None)."""
    types = ["draw_shape", "draw_freeform", "type_backwards", "type_pattern", "speed_type"]
    if challenge_type is None:
        challenge_type = random.choice(types)

    if challenge_type == "draw_shape":
        shape = random.choice(["moon", "star", "circle", "heart", "house"])
        challenge_data = json.dumps({"prompt": f"Draw a {shape}", "shape": shape})

    elif challenge_type == "draw_freeform":
        subject = random.choice(["cat", "dog", "tree", "flower", "fish"])
        challenge_data = json.dumps({"prompt": f"Draw your best {subject}"})

    elif challenge_type == "type_backwards":
        word = random.choice(["elephant", "butterfly", "dinosaur", "pineapple", "crocodile"])
        challenge_data = json.dumps({"word": word})

    elif challenge_type == "type_pattern":
        word = random.choice(["hello", "world", "python", "coding", "music"])
        expected = "".join(
            ch.upper() if i % 2 == 1 else ch.lower() for i, ch in enumerate(word)
        )
        challenge_data = json.dumps({
            "word": word,
            "pattern": "alternating_caps",
        })

    elif challenge_type == "speed_type":
        phrase = random.choice([
            "the quick brown fox",
            "hello world today",
            "code is poetry",
        ])
        challenge_data = json.dumps({"phrase": phrase, "time_limit_ms": 5000})

    else:
        raise ValueError(f"Unknown challenge type: {challenge_type}")

    return {"challenge_type": challenge_type, "challenge_data": challenge_data}


def validate_challenge(challenge_type: str, challenge_data: str, response_data: str) -> str:
    """Validate a CAPTCHA response. Returns 'passed', 'failed', or 'pending_review'."""
    cd = json.loads(challenge_data)
    rd = json.loads(response_data)

    if challenge_type == "type_backwards":
        word = cd["word"]
        expected = word[::-1]
        return "passed" if rd.get("text") == expected else "failed"

    elif challenge_type == "type_pattern":
        word = cd["word"]
        expected = "".join(
            ch.upper() if i % 2 == 1 else ch.lower() for i, ch in enumerate(word)
        )
        return "passed" if rd.get("text") == expected else "failed"

    elif challenge_type == "speed_type":
        phrase = cd["phrase"]
        time_limit = cd["time_limit_ms"]
        text_match = rd.get("text") == phrase
        time_ok = rd.get("duration_ms", float("inf")) <= time_limit
        return "passed" if text_match and time_ok else "failed"

    elif challenge_type in ("draw_shape", "draw_freeform"):
        strokes = rd.get("strokes", [])
        duration = rd.get("duration_ms", 0)

        if not strokes:
            return "failed"

        total_points = sum(len(stroke) for stroke in strokes)
        stroke_count = len(strokes)

        if stroke_count >= 3 and total_points >= 10 and duration >= 500:
            return "passed"

        if stroke_count >= 1:
            return "pending_review"

        return "failed"

    else:
        return "failed"


def create_captcha_token(user_id: int) -> str:
    """Create a short-lived JWT token that proves the user passed a CAPTCHA."""
    return create_access_token(
        data={"type": "captcha", "user_id": user_id},
        expires_minutes=settings.captcha_token_expire_minutes,
    )


def verify_captcha_token(token: str) -> dict | None:
    """Decode a captcha token and verify it has the correct type claim."""
    payload = decode_token(token)
    if payload is None:
        return None
    if payload.get("type") != "captcha":
        return None
    return payload
