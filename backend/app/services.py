"""Business logic services."""

import json
import logging
from typing import Optional
from sqlalchemy.orm import Session
from app.models import Resume, AiReview, User
from app.utils import claude

logger = logging.getLogger(__name__)


async def generate_resume_from_content(
    user: User,
    title: str,
    raw_content: str,
    db: Session,
) -> tuple[Resume, AiReview]:
    """Generate a structured resume from raw content and create AI review.

    Args:
        user: The authenticated user
        title: Resume title
        raw_content: Raw resume content (text/markdown)
        db: Database session

    Returns:
        Tuple of (Resume, AiReview) objects

    Raises:
        ValueError: If generation fails
        RuntimeError: If API key not configured
        anthropic.APITimeoutError: If Claude API times out
        anthropic.RateLimitError: If Claude API rate limited
    """
    try:
        # Generate structured resume from raw content
        content_json = await claude.generate_resume(raw_content)

        # Create resume record
        resume = Resume(
            user_id=user.id,
            title=title,
            content_json=content_json,
            status="draft",
        )
        db.add(resume)
        db.commit()
        db.refresh(resume)
        logger.info(f"Created resume {resume.id} for user {user.id}")

        # Generate AI review
        content_str = json.dumps(content_json, ensure_ascii=False)
        review_text = await claude.review_resume(content_str)

        review = AiReview(
            resume_id=resume.id,
            review_text=review_text,
        )
        db.add(review)
        db.commit()
        db.refresh(review)
        logger.info(f"Created review {review.id} for resume {resume.id}")

        return resume, review

    except Exception as e:
        db.rollback()
        logger.error(f"Error generating resume: {str(e)}")
        raise
