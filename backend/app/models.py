"""SQLAlchemy 2.0 ORM models.

Integer autoincrement primary keys are used across all tables to keep the
schema simple and avoid a pgcrypto / gen_random_uuid() extension dependency.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Float,
    DateTime,
    JSON,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    google_id: Mapped[Optional[str]] = mapped_column(
        String(255), unique=True, index=True, nullable=True
    )
    refresh_token_encrypted: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Indexed SHA-256 hash of the plaintext refresh token, so /auth/refresh can
    # look up the owning user by hash (AES-GCM ciphertext is non-deterministic
    # and cannot be re-searched directly).
    refresh_token_hash: Mapped[Optional[str]] = mapped_column(
        String(64), index=True, nullable=True
    )
    # "job_seeker" (default) / "staff" / "admin". Gates the zairyu-card staff
    # endpoints (see app/dependencies.py::require_staff). No signup flow sets
    # this to "staff" yet -- it must be granted manually per operator.
    role: Mapped[str] = mapped_column(
        String(20), server_default="job_seeker", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    resumes: Mapped[list["Resume"]] = relationship(back_populates="user")


class Resume(Base):
    __tablename__ = "resumes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="resumes")
    reviews: Mapped[list["AiReview"]] = relationship(back_populates="resume")


class AiReview(Base):
    __tablename__ = "ai_reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    resume_id: Mapped[int] = mapped_column(
        ForeignKey("resumes.id"), index=True, nullable=False
    )
    review_text: Mapped[str] = mapped_column(Text, nullable=False)
    score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    resume: Mapped["Resume"] = relationship(back_populates="reviews")


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    applicants: Mapped[list["AdminApplicant"]] = relationship(back_populates="job")


class AdminApplicant(Base):
    __tablename__ = "admin_applicants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[int] = mapped_column(
        ForeignKey("jobs.id"), index=True, nullable=False
    )
    applicant_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="new", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    job: Mapped["Job"] = relationship(back_populates="applicants")
    notifications: Mapped[list["SlackNotification"]] = relationship(
        back_populates="applicant"
    )


class SlackNotification(Base):
    __tablename__ = "slack_notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    applicant_id: Mapped[int] = mapped_column(
        ForeignKey("admin_applicants.id"), index=True, nullable=False
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    applicant: Mapped["AdminApplicant"] = relationship(back_populates="notifications")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    resource_type: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class ZairyuCard(Base):
    """在留カード (residence card) info for a job-seeker (``User``).

    ``card_number_encrypted`` / ``cardholder_name_kana_encrypted`` hold
    AES-256-GCM ciphertext (nonce embedded, see app/util/zairyu_encryption.py)
    -- never queried/filtered on directly.

    ``card_number_hash`` is a deterministic SHA-256 hash of the plaintext
    card number, used only to detect duplicate registrations across users
    (mirrors ``User.refresh_token_hash``, since GCM ciphertext is
    non-deterministic and can't be searched).

    ``validity_date`` is intentionally stored in plaintext (unlike the
    design doc's ``@encrypted`` annotation): the spec itself requires
    sorting/filtering/CSV-exporting by this date (see
    GET /api/zairyu/export-csv's sort_by=validityDate and the list screen's
    "expires within 3 months" highlight), which is impossible against
    non-deterministic ciphertext. A residence-card expiry date alone is not
    sensitive the way the card number/name are, so this is a deliberate,
    reported deviation rather than an oversight.
    """

    __tablename__ = "zairyu_cards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    card_number_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    card_number_hash: Mapped[str] = mapped_column(
        String(64), index=True, nullable=False
    )
    cardholder_name_kana_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    validity_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    status_of_residence_jp: Mapped[str] = mapped_column(String(100), nullable=False)
    status_of_residence_code: Mapped[str] = mapped_column(String(10), nullable=False)
    activity_restriction_jp: Mapped[str] = mapped_column(String(100), nullable=False)
    activity_restriction_code: Mapped[str] = mapped_column(String(10), nullable=False)

    consent_given: Mapped[bool] = mapped_column(
        Boolean, server_default=text("false"), nullable=False
    )
    consent_given_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    consent_document_url: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )

    is_verified: Mapped[bool] = mapped_column(
        Boolean, server_default=text("false"), nullable=False, index=True
    )
    verified_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    verification_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    can_work_in_japan: Mapped[bool] = mapped_column(
        Boolean, server_default=text("false"), nullable=False, index=True
    )
    work_restriction_details: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True, index=True
    )

    access_logs: Mapped[list["ZairyuAccessLog"]] = relationship(
        back_populates="zairyu_card"
    )

    __table_args__ = (
        # Partial unique index (not a plain @@unique) so a soft-deleted card
        # doesn't permanently block the same job-seeker from registering a
        # new one -- a plain unique constraint would still "see" the
        # soft-deleted row and reject the insert.
        Index(
            "ix_zairyu_cards_user_id_active",
            "user_id",
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
            sqlite_where=text("deleted_at IS NULL"),
        ),
    )


class ZairyuAccessLog(Base):
    """Audit trail row for every staff read/verify/update/export of a card."""

    __tablename__ = "zairyu_access_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    zairyu_card_id: Mapped[int] = mapped_column(
        ForeignKey("zairyu_cards.id"), index=True, nullable=False
    )
    staff_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), index=True, nullable=False
    )
    action: Mapped[str] = mapped_column(String(20), nullable=False)  # view/verify/export/update
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    zairyu_card: Mapped["ZairyuCard"] = relationship(back_populates="access_logs")
