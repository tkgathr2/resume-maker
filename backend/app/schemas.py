"""Pydantic v2 request/response schemas."""

import json
from datetime import datetime
from typing import Optional, Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

# Max serialized size of a résumé's content_json blob. Guards against
# oversized payloads (e.g. pasted-in file dumps) bloating the DB/API.
_MAX_CONTENT_JSON_BYTES = 50_000

# Allowed résumé lifecycle states.
_RESUME_STATUS_PATTERN = r"^(draft|active|archived)$"


def _validate_content_json_size(value: dict[str, Any]) -> dict[str, Any]:
    size = len(json.dumps(value, ensure_ascii=False))
    if size > _MAX_CONTENT_JSON_BYTES:
        raise ValueError(
            f"content_json exceeds {_MAX_CONTENT_JSON_BYTES} bytes (got {size})"
        )
    return value


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
    title: str = Field(..., min_length=1, max_length=255)
    content_json: dict[str, Any] = Field(default_factory=dict)
    status: str = Field(default="draft", pattern=_RESUME_STATUS_PATTERN)

    @field_validator("content_json")
    @classmethod
    def _check_content_json_size(cls, v: dict[str, Any]) -> dict[str, Any]:
        return _validate_content_json_size(v)


class ResumeUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    content_json: Optional[dict[str, Any]] = None
    status: Optional[str] = Field(default=None, pattern=_RESUME_STATUS_PATTERN)

    @field_validator("content_json")
    @classmethod
    def _check_content_json_size(cls, v: Optional[dict[str, Any]]) -> Optional[dict[str, Any]]:
        if v is None:
            return v
        return _validate_content_json_size(v)


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
# Resume Generation
# --------------------------------------------------------------------------- #
class ResumeGenerateRequest(BaseModel):
    """Request to generate a resume with AI."""
    title: str
    content: str  # Raw resume content (text/markdown)


class ResumeGenerationOut(BaseModel):
    """Response from resume generation."""
    model_config = ConfigDict(from_attributes=True)

    resume_id: int
    title: str
    content_json: dict[str, Any]
    review_text: str
    status: str
    created_at: datetime


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
