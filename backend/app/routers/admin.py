"""Admin router: applicants, jobs, and Slack status notifications."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import get_current_user
from app.models import AdminApplicant, Job, SlackNotification, User
from app.schemas import (
    AdminApplicantCreate,
    AdminApplicantOut,
    AdminApplicantUpdate,
    JobCreate,
    JobOut,
)
from app.utils.slack import send_slack_notification

logger = logging.getLogger(__name__)

router = APIRouter()


# --------------------------------------------------------------------------- #
# Applicants
# --------------------------------------------------------------------------- #
@router.get("/applicants", response_model=list[AdminApplicantOut])
async def list_applicants(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    applicants = db.query(AdminApplicant).all()
    return [AdminApplicantOut.model_validate(a) for a in applicants]


@router.get("/applicants/{applicant_id}", response_model=AdminApplicantOut)
async def get_applicant(
    applicant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    applicant = (
        db.query(AdminApplicant).filter(AdminApplicant.id == applicant_id).first()
    )
    if applicant is None:
        raise HTTPException(status_code=404, detail="Applicant not found")
    return AdminApplicantOut.model_validate(applicant)


@router.post("/applicants", response_model=AdminApplicantOut, status_code=201)
async def create_applicant(
    payload: AdminApplicantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    applicant = AdminApplicant(
        job_id=payload.job_id,
        applicant_name=payload.applicant_name,
        email=payload.email,
        status=payload.status,
    )
    db.add(applicant)
    db.commit()
    db.refresh(applicant)
    return AdminApplicantOut.model_validate(applicant)


@router.put("/applicants/{applicant_id}", response_model=AdminApplicantOut)
async def update_applicant(
    applicant_id: int,
    payload: AdminApplicantUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    applicant = (
        db.query(AdminApplicant).filter(AdminApplicant.id == applicant_id).first()
    )
    if applicant is None:
        raise HTTPException(status_code=404, detail="Applicant not found")

    old_status = applicant.status
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(applicant, field, value)
    db.commit()
    db.refresh(applicant)

    new_status = applicant.status
    message = (
        f"🎯 応募者 {applicant.applicant_name} ステータス変更: "
        f"{old_status} → {new_status}"
    )
    await send_slack_notification(message)

    notification = SlackNotification(applicant_id=applicant.id, message=message)
    db.add(notification)
    db.commit()

    return AdminApplicantOut.model_validate(applicant)


# --------------------------------------------------------------------------- #
# Jobs
# --------------------------------------------------------------------------- #
@router.get("/jobs", response_model=list[JobOut])
async def list_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    jobs = db.query(Job).all()
    return [JobOut.model_validate(j) for j in jobs]


@router.post("/jobs", response_model=JobOut, status_code=201)
async def create_job(
    payload: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = Job(title=payload.title, description=payload.description)
    db.add(job)
    db.commit()
    db.refresh(job)
    return JobOut.model_validate(job)
