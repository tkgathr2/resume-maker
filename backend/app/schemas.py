"""Pydantic v2 request/response schemas."""

import json
from datetime import date, datetime
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


# --------------------------------------------------------------------------- #
# Zairyu Card (在留カード)
#
# Field names use camelCase aliases (unlike the rest of this file) to match
# the literal JSON contract in the detail design doc
# (resume-maker-zairyu-detail-design-v1.0.md section 4), since the frontend
# is being implemented against that doc in parallel.
# --------------------------------------------------------------------------- #
_CARD_NUMBER_PATTERN = r"^[A-Z0-9]{16}$"
_KANA_PATTERN = r"^[ァ-ヶーｦ-ﾟ\s]{1,50}$"
_CODE_PATTERN = r"^\d{2}$"


def _coerce_to_date(v: Any) -> Any:
    if isinstance(v, datetime):
        return v.date()
    return v


class ZairyuCardCreateOrUpdate(BaseModel):
    """Request body for POST /api/zairyu/create-or-update (job seeker)."""

    model_config = ConfigDict(populate_by_name=True)

    card_number: str = Field(..., alias="cardNumber", pattern=_CARD_NUMBER_PATTERN)
    cardholder_name_kana: str = Field(
        ..., alias="cardholderNameKana", pattern=_KANA_PATTERN
    )
    validity_date: date = Field(..., alias="validityDate")
    status_of_residence_code: str = Field(
        ..., alias="statusOfResidenceCode", pattern=_CODE_PATTERN
    )
    activity_restriction: str = Field(
        ..., alias="activityRestriction", pattern=_CODE_PATTERN
    )
    consent_given: bool = Field(..., alias="consentGiven")

    @field_validator("validity_date")
    @classmethod
    def _no_past_date(cls, v: date) -> date:
        if v < date.today():
            raise ValueError("validityDate must not be in the past")
        return v

    @field_validator("consent_given")
    @classmethod
    def _consent_required(cls, v: bool) -> bool:
        if not v:
            raise ValueError("consentGiven must be true")
        return v


class ZairyuCardCreateOut(BaseModel):
    """Response for POST /api/zairyu/create-or-update."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    user_id: int = Field(alias="jobSeekerId")
    status_of_residence_jp: str = Field(alias="statusOfResidenceJp")
    validity_date: date = Field(alias="validityDate")
    is_verified: bool = Field(alias="isVerified")
    can_work_in_japan: bool = Field(alias="canWorkInJapan")
    created_at: datetime = Field(alias="createdAt")

    @field_validator("validity_date", mode="before")
    @classmethod
    def _validity_date_to_date(cls, v: Any) -> Any:
        return _coerce_to_date(v)


class ZairyuAccessLogOut(BaseModel):
    """One row of GET /api/zairyu/:cardId's accessLogs."""

    model_config = ConfigDict(populate_by_name=True)

    timestamp: datetime
    action: str
    staff_name: Optional[str] = Field(default=None, alias="staffName")
    ip_address: Optional[str] = Field(default=None, alias="ipAddress")


class ZairyuCardDetailOut(BaseModel):
    """Response for GET /api/zairyu/:cardId (staff+)."""

    model_config = ConfigDict(populate_by_name=True)

    id: int
    job_seeker_id: int = Field(alias="jobSeekerId")
    job_seeker_name: Optional[str] = Field(default=None, alias="jobSeekerName")
    card_number: str = Field(alias="cardNumber")  # masked, e.g. "****8901"
    cardholder_name_kana: str = Field(alias="cardholderNameKana")
    validity_date: date = Field(alias="validityDate")
    status_of_residence_jp: str = Field(alias="statusOfResidenceJp")
    activity_restriction_jp: str = Field(alias="activityRestrictionJp")
    is_verified: bool = Field(alias="isVerified")
    verified_by: Optional[str] = Field(default=None, alias="verifiedBy")
    verified_at: Optional[datetime] = Field(default=None, alias="verifiedAt")
    verification_notes: Optional[str] = Field(default=None, alias="verificationNotes")
    can_work_in_japan: bool = Field(alias="canWorkInJapan")
    work_restriction_details: Optional[str] = Field(
        default=None, alias="workRestrictionDetails"
    )
    access_logs: list[ZairyuAccessLogOut] = Field(
        default_factory=list, alias="accessLogs"
    )


class ZairyuVerifyRequest(BaseModel):
    """Request body for PATCH /api/zairyu/:cardId/verify (staff+)."""

    model_config = ConfigDict(populate_by_name=True)

    verification_notes: Optional[str] = Field(
        default=None, alias="verificationNotes", max_length=2000
    )


class ZairyuVerifyOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    is_verified: bool = Field(alias="isVerified")
    verified_at: datetime = Field(alias="verifiedAt")
    verified_by: str = Field(alias="verifiedBy")
    verification_notes: Optional[str] = Field(default=None, alias="verificationNotes")


class ZairyuWorkEligibilityRequest(BaseModel):
    """Request body for PATCH /api/zairyu/:cardId/set-work-eligibility (staff+)."""

    model_config = ConfigDict(populate_by_name=True)

    can_work_in_japan: bool = Field(..., alias="canWorkInJapan")
    work_restriction_details: Optional[str] = Field(
        default=None, alias="workRestrictionDetails", max_length=2000
    )


class ZairyuWorkEligibilityOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    can_work_in_japan: bool = Field(alias="canWorkInJapan")
    work_restriction_details: Optional[str] = Field(
        default=None, alias="workRestrictionDetails"
    )
    updated_at: datetime = Field(alias="updatedAt")
