from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.core.database import get_session
from app.core.deps import get_current_user
from app.models.captcha import CaptchaChallenge, CaptchaReview
from app.models.user import User
from app.services.captcha import (
    generate_challenge,
    validate_challenge,
    create_captcha_token,
)

router = APIRouter(prefix="/api/captcha", tags=["captcha"])


# ---------------------------------------------------------------------------
# Get a new challenge
# ---------------------------------------------------------------------------
@router.get("/challenge")
def get_challenge(
    type: str | None = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = generate_challenge(challenge_type=type)
    challenge = CaptchaChallenge(
        user_id=current_user.id,
        challenge_type=result["challenge_type"],
        challenge_data=result["challenge_data"],
    )
    session.add(challenge)
    session.commit()
    session.refresh(challenge)
    return {
        "challenge_id": challenge.id,
        "type": challenge.challenge_type,
        "data": challenge.challenge_data,
    }


# ---------------------------------------------------------------------------
# Submit a challenge response
# ---------------------------------------------------------------------------
@router.post("/submit")
def submit_challenge(
    body: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    challenge_id = body.get("challenge_id")
    response_data = body.get("response")

    if challenge_id is None or response_data is None:
        raise HTTPException(status_code=400, detail="Missing challenge_id or response")

    challenge = session.get(CaptchaChallenge, challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    result = validate_challenge(
        challenge.challenge_type, challenge.challenge_data, response_data
    )

    challenge.response_data = response_data
    challenge.server_passed = result == "passed"
    if result == "pending_review":
        challenge.crowd_status = "pending_review"
    session.add(challenge)
    session.commit()

    if result == "passed":
        token = create_captcha_token(current_user.id)
        return {"status": "passed", "captcha_token": token}
    elif result == "pending_review":
        return {"status": "pending_review"}
    else:
        raise HTTPException(status_code=400, detail="failed")


# ---------------------------------------------------------------------------
# Review queue
# ---------------------------------------------------------------------------
@router.get("/review-queue")
def review_queue(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    statement = select(CaptchaChallenge).where(
        CaptchaChallenge.crowd_status == "pending_review",
        CaptchaChallenge.user_id != current_user.id,
    )
    challenges = session.exec(statement).all()
    return challenges


# ---------------------------------------------------------------------------
# Submit a review for a challenge
# ---------------------------------------------------------------------------
@router.post("/review/{challenge_id}")
def review_challenge(
    challenge_id: int,
    body: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    approved = body.get("approved")
    if approved is None:
        raise HTTPException(status_code=400, detail="Missing approved field")

    challenge = session.get(CaptchaChallenge, challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    review = CaptchaReview(
        challenge_id=challenge_id,
        reviewer_id=current_user.id,
        approved=approved,
    )
    session.add(review)
    session.commit()

    # Count total reviews for this challenge
    reviews = session.exec(
        select(CaptchaReview).where(CaptchaReview.challenge_id == challenge_id)
    ).all()

    if len(reviews) >= 3:
        approved_count = sum(1 for r in reviews if r.approved)
        rejected_count = sum(1 for r in reviews if not r.approved)
        if approved_count >= 2:
            challenge.crowd_status = "approved"
        elif rejected_count >= 2:
            challenge.crowd_status = "rejected"
        session.add(challenge)
        session.commit()

    return {"status": "recorded"}
