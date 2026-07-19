"""在留カード (residence card) management router.

Implements the 5 endpoints from
``~/.claude/specs/resume-maker-zairyu-detail-design-v1.0.md`` section 4,
adapted to this repo's actual stack (FastAPI + SQLAlchemy + Alembic --
the design doc assumes a Next.js/Prisma backend, which this repo does not
use; see the PR description for the full list of adaptations).
"""

import csv
import io
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import get_current_user, require_staff
from app.models import User, ZairyuAccessLog, ZairyuCard
from app.schemas import (
    ZairyuAccessLogOut,
    ZairyuCardCreateOrUpdate,
    ZairyuCardCreateOut,
    ZairyuCardDetailOut,
    ZairyuVerifyRequest,
    ZairyuVerifyOut,
    ZairyuWorkEligibilityRequest,
    ZairyuWorkEligibilityOut,
)
from app.util.zairyu_constants import (
    activity_restriction_label,
    status_of_residence_label,
)
from app.util.zairyu_encryption import (
    decrypt_field,
    encrypt_field,
    hash_card_number,
    mask_card_number,
)

logger = logging.getLogger(__name__)

router = APIRouter()

_ACCESS_LOG_RECENT_LIMIT = 20
_SORT_BY_ALLOWED = ("createdAt", "validityDate", "jobSeekerName")


def _get_active_card_or_404(db: Session, card_id: int) -> ZairyuCard:
    """Fetch a non-soft-deleted card by id or raise 404."""
    card = (
        db.query(ZairyuCard)
        .filter(and_(ZairyuCard.id == card_id, ZairyuCard.deleted_at.is_(None)))
        .first()
    )
    if card is None:
        raise HTTPException(status_code=404, detail="Zairyu card not found")
    return card


def _record_access_log(
    db: Session, card_id: int, staff_id: int, action: str, request: Request
) -> None:
    db.add(
        ZairyuAccessLog(
            zairyu_card_id=card_id,
            staff_id=staff_id,
            action=action,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
    )
    db.commit()


def _staff_label(db: Session, staff_id: int | None) -> str | None:
    """Resolve a staff user id to a display name (falls back to email)."""
    if staff_id is None:
        return None
    staff = db.query(User).filter(User.id == staff_id).first()
    if staff is None:
        return None
    return staff.name or staff.email


@router.post("/create-or-update", response_model=ZairyuCardCreateOut, status_code=201)
async def create_or_update_zairyu_card(
    payload: ZairyuCardCreateOrUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """求職者が自身の在留カード情報を初回入力・更新する。"""
    card_number_hash = hash_card_number(payload.card_number)

    duplicate = (
        db.query(ZairyuCard)
        .filter(
            and_(
                ZairyuCard.card_number_hash == card_number_hash,
                ZairyuCard.user_id != current_user.id,
                ZairyuCard.deleted_at.is_(None),
            )
        )
        .first()
    )
    if duplicate is not None:
        raise HTTPException(
            status_code=400, detail="この在留カード番号は既に登録済みです"
        )

    card = (
        db.query(ZairyuCard)
        .filter(
            and_(
                ZairyuCard.user_id == current_user.id,
                ZairyuCard.deleted_at.is_(None),
            )
        )
        .first()
    )

    status_jp = status_of_residence_label(payload.status_of_residence_code)
    restriction_jp = activity_restriction_label(payload.activity_restriction)
    validity_dt = datetime.combine(payload.validity_date, datetime.min.time())
    encrypted_card_number = encrypt_field(payload.card_number)
    encrypted_kana = encrypt_field(payload.cardholder_name_kana)
    consent_at = datetime.now(timezone.utc) if payload.consent_given else None

    if card is None:
        card = ZairyuCard(
            user_id=current_user.id,
            card_number_encrypted=encrypted_card_number,
            card_number_hash=card_number_hash,
            cardholder_name_kana_encrypted=encrypted_kana,
            validity_date=validity_dt,
            status_of_residence_jp=status_jp,
            status_of_residence_code=payload.status_of_residence_code,
            activity_restriction_jp=restriction_jp,
            activity_restriction_code=payload.activity_restriction,
            consent_given=payload.consent_given,
            consent_given_at=consent_at,
        )
        db.add(card)
    else:
        card.card_number_encrypted = encrypted_card_number
        card.card_number_hash = card_number_hash
        card.cardholder_name_kana_encrypted = encrypted_kana
        card.validity_date = validity_dt
        card.status_of_residence_jp = status_jp
        card.status_of_residence_code = payload.status_of_residence_code
        card.activity_restriction_jp = restriction_jp
        card.activity_restriction_code = payload.activity_restriction
        card.consent_given = payload.consent_given
        if payload.consent_given:
            card.consent_given_at = consent_at

    db.commit()
    db.refresh(card)
    return card


@router.get("/export-csv")
async def export_zairyu_csv(
    request: Request,
    filter_verified: bool | None = Query(default=None),
    filter_work_eligible: bool | None = Query(default=None),
    sort_by: str = Query(default="createdAt"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    """CSV エクスポート（スタッフ以上）。暗号化フィールド（カード番号等）は出力しない。"""
    if sort_by not in _SORT_BY_ALLOWED:
        raise HTTPException(
            status_code=400,
            detail=f"sort_by must be one of {_SORT_BY_ALLOWED}",
        )

    query = db.query(ZairyuCard).filter(ZairyuCard.deleted_at.is_(None))
    if filter_verified is not None:
        query = query.filter(ZairyuCard.is_verified == filter_verified)
    if filter_work_eligible is not None:
        query = query.filter(ZairyuCard.can_work_in_japan == filter_work_eligible)
    cards = query.all()

    job_seekers = {
        u.id: u for u in db.query(User).filter(
            User.id.in_([c.user_id for c in cards])
        ).all()
    } if cards else {}

    if sort_by == "createdAt":
        cards.sort(key=lambda c: c.created_at)
    elif sort_by == "validityDate":
        cards.sort(key=lambda c: c.validity_date)
    else:  # jobSeekerName
        cards.sort(key=lambda c: (job_seekers.get(c.user_id).name or "") if job_seekers.get(c.user_id) else "")

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["求職者氏名", "在留資格", "有効期限", "ステータス", "検証者名", "検証日時"])
    for c in cards:
        job_seeker = job_seekers.get(c.user_id)
        if not c.is_verified:
            status_label = "未検証"
        elif c.can_work_in_japan:
            status_label = "就労可能"
        else:
            status_label = "就労不可"
        writer.writerow(
            [
                job_seeker.name if job_seeker else "",
                c.status_of_residence_jp,
                c.validity_date.date().isoformat(),
                status_label,
                _staff_label(db, c.verified_by) or "",
                c.verified_at.isoformat() if c.verified_at else "",
            ]
        )
        _record_access_log(db, c.id, current_user.id, "export", request)

    filename = f"zairyu_cards_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{card_id}", response_model=ZairyuCardDetailOut)
async def get_zairyu_card(
    card_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    """スタッフが在留カード情報を取得（cardNumber は末尾4桁のみ）。"""
    card = _get_active_card_or_404(db, card_id)
    job_seeker = db.query(User).filter(User.id == card.user_id).first()

    logs = (
        db.query(ZairyuAccessLog)
        .filter(ZairyuAccessLog.zairyu_card_id == card.id)
        .order_by(ZairyuAccessLog.timestamp.desc())
        .limit(_ACCESS_LOG_RECENT_LIMIT)
        .all()
    )
    log_items = [
        ZairyuAccessLogOut(
            timestamp=log.timestamp,
            action=log.action,
            staff_name=_staff_label(db, log.staff_id),
            ip_address=log.ip_address,
        )
        for log in logs
    ]

    try:
        card_number_plain = decrypt_field(card.card_number_encrypted)
        cardholder_name_kana = decrypt_field(card.cardholder_name_kana_encrypted)
    except ValueError as exc:
        logger.error("Failed to decrypt zairyu card %s: %s", card_id, exc)
        raise HTTPException(status_code=500, detail="Internal error") from exc

    _record_access_log(db, card.id, current_user.id, "view", request)

    return ZairyuCardDetailOut(
        id=card.id,
        job_seeker_id=card.user_id,
        job_seeker_name=(job_seeker.name if job_seeker else None),
        card_number=mask_card_number(card_number_plain),
        cardholder_name_kana=cardholder_name_kana,
        validity_date=card.validity_date.date(),
        status_of_residence_jp=card.status_of_residence_jp,
        activity_restriction_jp=card.activity_restriction_jp,
        is_verified=card.is_verified,
        verified_by=_staff_label(db, card.verified_by),
        verified_at=card.verified_at,
        verification_notes=card.verification_notes,
        can_work_in_japan=card.can_work_in_japan,
        work_restriction_details=card.work_restriction_details,
        access_logs=log_items,
    )


@router.patch("/{card_id}/verify", response_model=ZairyuVerifyOut)
async def verify_zairyu_card(
    card_id: int,
    payload: ZairyuVerifyRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    """スタッフが在留カード情報を検証完了とする。"""
    card = _get_active_card_or_404(db, card_id)

    card.is_verified = True
    card.verified_by = current_user.id
    card.verified_at = datetime.now(timezone.utc)
    card.verification_notes = payload.verification_notes
    db.commit()
    db.refresh(card)

    _record_access_log(db, card.id, current_user.id, "verify", request)

    return ZairyuVerifyOut(
        id=card.id,
        is_verified=card.is_verified,
        verified_at=card.verified_at,
        verified_by=_staff_label(db, card.verified_by) or "",
        verification_notes=card.verification_notes,
    )


@router.patch("/{card_id}/set-work-eligibility", response_model=ZairyuWorkEligibilityOut)
async def set_work_eligibility(
    card_id: int,
    payload: ZairyuWorkEligibilityRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    """スタッフが就労判定を確定する。"""
    card = _get_active_card_or_404(db, card_id)

    card.can_work_in_japan = payload.can_work_in_japan
    card.work_restriction_details = payload.work_restriction_details
    db.commit()
    db.refresh(card)

    _record_access_log(db, card.id, current_user.id, "update", request)

    return ZairyuWorkEligibilityOut(
        id=card.id,
        can_work_in_japan=card.can_work_in_japan,
        work_restriction_details=card.work_restriction_details,
        updated_at=card.updated_at,
    )
