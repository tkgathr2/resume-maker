"""Pydantic v2 request/response schemas."""

from datetime import datetime
from typing import Optional, Any

from pydantic import BaseModel, ConfigDict


# --------------------------------------------------------------------------- #
# User
# --------------------------------------------------------------------------- #
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: Optional[str] = None


# --------------------------------------------------------------------------- #
# Auth
# --------------------------------------------------------------------------- #
class GoogleSignInRequest(BaseModel):
    id_token: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    expires_in: int
    token_type: str = "Bearer"
    user: Optional[UserOut] = None


# --------------------------------------------------------------------------- #
# Resume
# --------------------------------------------------------------------------- #
class ResumeCreate(BaseModel):
    title: str
    content_json: dict[str, Any] = {}
    status: str = "draft"


class ResumeUpdate(BaseModel):
    title: Optional[str] = None
    content_json: Optional[dict[str, Any]] = None
    status: Optional[str] = None


class ResumeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    content_json: dict[str, Any]
    status: str
    created_at: datetime
    updated_at: datetime


class ResumeListOut(BaseModel):
    resumes: list[ResumeOut]


# --------------------------------------------------------------------------- #
# AI Review
# --------------------------------------------------------------------------- #
class AiReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    resume_id: int
    review_text: str
    score: Optional[float] = None
    created_at: datetime


class AiReviewRequest(BaseModel):
    resume_id: int


class ResumeWithReviewOut(BaseModel):
    resume: ResumeOut
    review: AiReviewOut


# --------------------------------------------------------------------------- #
# Job
# --------------------------------------------------------------------------- #
class JobCreate(BaseModel):
    title: str
    description: Optional[str] = None


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str] = None
    created_at: datetime


# --------------------------------------------------------------------------- #
# Admin Applicant
# --------------------------------------------------------------------------- #
class AdminApplicantCreate(BaseModel):
    job_id: int
    applicant_name: str
    email: Optional[str] = None
    status: str = "new"


class AdminApplicantUpdate(BaseModel):
    applicant_name: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = None


class AdminApplicantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_id: int
    applicant_name: str
    email: Optional[str] = None
    status: str
    created_at: datetime
