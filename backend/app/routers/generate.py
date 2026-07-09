"""Resume generation API endpoint."""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from anthropic import APITimeoutError, RateLimitError

from app.db import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas import ResumeGenerateRequest, ResumeGenerationOut
from app.services import generate_resume_from_content
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/generate", response_model=ResumeGenerationOut, status_code=201)
async def generate_resume(
    payload: ResumeGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a new resume from raw content using Claude Haiku.

    Takes raw resume content (text/markdown), structures it using AI,
    creates a resume record, and generates an AI review.

    Args:
        payload: ResumeGenerateRequest with title and raw content
        db: Database session
        current_user: Authenticated user

    Returns:
        ResumeGenerationOut with resume_id, title, content_json, review_text

    Raises:
        400 Bad Request: Invalid input
        401 Unauthorized: Missing/invalid authentication
        503 Service Unavailable: Claude API timeout or rate limited
        500 Internal Server Error: Other API errors
    """
    # Validate input
    if not payload.title or not payload.title.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="title cannot be empty",
        )

    if not payload.content or not payload.content.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="content cannot be empty",
        )

    # Check for PII in raw content (basic check)
    pii_patterns = ["パスポート", "マイナンバー"]
    content_lower = payload.content.lower()
    for pattern in pii_patterns:
        if pattern.lower() in content_lower:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="sensitive PII detected in content",
            )

    try:
        resume, review = await generate_resume_from_content(
            user=current_user,
            title=payload.title,
            raw_content=payload.content,
            db=db,
        )

        return ResumeGenerationOut(
            resume_id=resume.id,
            title=resume.title,
            content_json=resume.content_json,
            review_text=review.review_text,
            status=resume.status,
            created_at=resume.created_at,
        )

    except APITimeoutError as e:
        logger.error(f"Claude API timeout: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service temporarily unavailable (timeout)",
        )

    except RateLimitError as e:
        logger.error(f"Claude API rate limited: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service rate limited, please try again later",
        )

    except Exception as e:
        logger.error(f"Error generating resume: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error generating resume",
        )
