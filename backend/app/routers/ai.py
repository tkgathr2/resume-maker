"""AI review router."""

import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import get_current_user
from app.models import AiReview, Resume, User
from app.schemas import AiReviewOut, AiReviewRequest
from app.utils import claude

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/review", response_model=AiReviewOut, status_code=201)
async def review(
    payload: AiReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate and persist an AI review for an existing résumé."""
    resume = (
        db.query(Resume)
        .filter(and_(Resume.id == payload.resume_id, Resume.deleted_at.is_(None)))
        .first()
    )
    if resume is None:
        raise HTTPException(status_code=404, detail="Resume not found")

    content_str = json.dumps(resume.content_json, ensure_ascii=False)
    review_text = await claude.review_resume(content_str)

    ai_review = AiReview(resume_id=resume.id, review_text=review_text)
    db.add(ai_review)
    db.commit()
    db.refresh(ai_review)

    return AiReviewOut.model_validate(ai_review)
