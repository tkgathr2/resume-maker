"""Shared FastAPI dependencies (auth, DB)."""

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User
from app.utils.jwt import decode_access_token

# Re-exported for convenience.
__all__ = ["get_db", "get_current_user", "require_staff"]

# auto_error=False so a *missing* Authorization header yields our own 401
# (rather than HTTPBearer's default 403), matching the API spec.
_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the authenticated user from a Bearer JWT.

    Raises 401 if the token is missing/invalid/expired or the user is unknown.
    """
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing authentication token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None or not credentials.credentials:
        raise credentials_exc

    try:
        payload = decode_access_token(credentials.credentials)
    except jwt.PyJWTError:
        raise credentials_exc

    sub = payload.get("sub")
    if sub is None:
        raise credentials_exc

    try:
        user_id = int(sub)
    except (TypeError, ValueError):
        raise credentials_exc

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exc

    return user


def require_staff(current_user: User = Depends(get_current_user)) -> User:
    """Require the authenticated user to have a "staff" or "admin" role.

    Used to gate the zairyu-card staff endpoints (view/verify/judge/export)
    to staff+, per the design doc's role model. Raises 403 for the default
    "job_seeker" role.
    """
    if current_user.role not in ("staff", "admin"):
        raise HTTPException(status_code=403, detail="Forbidden: staff role required")
    return current_user
