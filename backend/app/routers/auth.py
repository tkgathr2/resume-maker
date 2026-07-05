"""Authentication router: Google OAuth sign-in + JWT refresh."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import User
from app.schemas import (
    GoogleSignInRequest,
    RefreshRequest,
    TokenResponse,
    UserOut,
)
from app.utils.jwt import (
    create_access_token,
    create_refresh_token,
    encrypt_refresh_token,
    hash_refresh_token,
)

logger = logging.getLogger(__name__)

router = APIRouter()


def _issue_tokens(user: User, db: Session) -> TokenResponse:
    """Create a fresh access + refresh token pair and persist the refresh token."""
    access_token = create_access_token(user.id, user.email)
    raw_refresh = create_refresh_token()

    user.refresh_token_encrypted = encrypt_refresh_token(raw_refresh)
    user.refresh_token_hash = hash_refresh_token(raw_refresh)
    db.commit()
    db.refresh(user)

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        expires_in=settings.jwt_expiration_hours * 3600,
        user=UserOut.model_validate(user),
    )


@router.post("/google-signin", response_model=TokenResponse)
async def google_signin(payload: GoogleSignInRequest, db: Session = Depends(get_db)):
    """Verify a Google ID token, find-or-create the user, and issue tokens."""
    try:
        id_info = google_id_token.verify_oauth2_token(
            payload.id_token,
            google_requests.Request(),
            settings.google_client_id,
        )
    except Exception as exc:  # noqa: BLE001 - any verification failure is a 401
        logger.warning("Google id_token verification failed: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid token") from exc

    email = id_info.get("email")
    google_id = id_info.get("sub")
    name = id_info.get("name")

    if not email or not google_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.google_id == google_id).first()
    if user is None:
        user = db.query(User).filter(User.email == email).first()

    if user is None:
        user = User(email=email, name=name, google_id=google_id)
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.name = name or user.name
        user.google_id = google_id
        db.commit()
        db.refresh(user)

    return _issue_tokens(user, db)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    """Exchange a valid refresh token for a fresh access token."""
    token_hash = hash_refresh_token(payload.refresh_token)
    user = db.query(User).filter(User.refresh_token_hash == token_hash).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid/expired refresh token")

    access_token = create_access_token(user.id, user.email)
    return TokenResponse(
        access_token=access_token,
        expires_in=settings.jwt_expiration_hours * 3600,
        user=UserOut.model_validate(user),
    )
