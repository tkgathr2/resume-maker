"""Resume management router."""

import json
import logging

from anthropic import APIConnectionError, APIError, APITimeoutError, RateLimitError
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import and_
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.db import get_db
from app.dependencies import get_current_user
from app.models import AiReview, Resume, User
from app.schemas import (
    AiReviewOut,
    ResumeCreate,
    ResumeOut,
    ResumeUpdate,
    ResumeWithReviewOut,
)
from app.utils import claude

logger = logging.getLogger(__name__)

router = APIRouter()


def _get_active_resume_or_404(db: Session, resume_id: int, user_id: int) -> Resume:
    """Fetch a non-soft-deleted résumé owned by ``user_id`` or raise 404.

    Filtering by owner (not just id) prevents IDOR: a résumé that exists but
    belongs to a different user is indistinguishable from a missing one.
    """
    resume = (
        db.query(Resume)
        .filter(
            and_(
                Resume.id == resume_id,
                Resume.user_id == user_id,
                Resume.deleted_at.is_(None),
            )
        )
        .first()
    )
    if resume is None:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume


@router.post("/generate", response_model=ResumeWithReviewOut, status_code=201)
async def generate_resume(
    payload: ResumeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a résumé and immediately generate an AI review for it."""
    resume = Resume(
        user_id=current_user.id,
        title=payload.title,
        content_json=payload.content_json,
        status=payload.status,
    )
    db.add(resume)
    # Flush (not commit) so resume.id is available without ending the
    # transaction. If the Claude call below fails, db.rollback() then undoes
    # the résumé insert too, instead of leaving an orphaned, review-less row.
    db.flush()
    db.refresh(resume)

    content_str = json.dumps(resume.content_json, ensure_ascii=False)
    try:
        review_text = await claude.review_resume(content_str)
    except RateLimitError as e:
        db.rollback()
        logger.error("Claude API rate limit exceeded: %s", str(e))
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    except (APITimeoutError, APIConnectionError) as e:
        db.rollback()
        logger.error("Claude API unavailable: %s", str(e))
        raise HTTPException(status_code=503, detail="Service unavailable")
    except APIError as e:
        db.rollback()
        logger.error("Claude API error: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail="Internal error")
    except Exception as e:
        db.rollback()
        logger.error("Unexpected error generating resume review: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail="Internal error")

    review = AiReview(resume_id=resume.id, review_text=review_text)
    db.add(review)
    db.commit()
    db.refresh(review)

    return ResumeWithReviewOut(
        resume=ResumeOut.model_validate(resume),
        review=AiReviewOut.model_validate(review),
    )


@router.get("/{resume_id}", response_model=ResumeOut)
async def get_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    resume = _get_active_resume_or_404(db, resume_id, current_user.id)
    return ResumeOut.model_validate(resume)


@router.put("/{resume_id}", response_model=ResumeOut)
async def update_resume(
    resume_id: int,
    payload: ResumeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    resume = _get_active_resume_or_404(db, resume_id, current_user.id)
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(resume, field, value)
    db.commit()
    db.refresh(resume)
    return ResumeOut.model_validate(resume)


@router.delete("/{resume_id}", status_code=204)
async def delete_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    resume = _get_active_resume_or_404(db, resume_id, current_user.id)
    resume.deleted_at = func.now()
    db.commit()
    return Response(status_code=204)


@router.get("/user/{user_id}", response_model=list[ResumeOut])
async def list_user_resumes(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    resumes = (
        db.query(Resume)
        .filter(and_(Resume.user_id == user_id, Resume.deleted_at.is_(None)))
        .all()
    )
    return [ResumeOut.model_validate(r) for r in resumes]
