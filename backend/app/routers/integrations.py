"""Google Drive export integration (MVP: service-account based upload)."""

import io
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Resume
from app.routers.pdf import generate_resume_pdf
from app.schemas import GoogleExportResponse

logger = logging.getLogger(__name__)

router = APIRouter()


def _upload_pdf_to_drive(file_name: str, pdf_bytes: bytes) -> str:
    """Upload PDF bytes to Google Drive using a service account.

    MVP: if service-account credentials are not configured/available, this
    logs and raises so the caller can degrade gracefully instead of 500ing
    the whole API.
    """
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaIoBaseUpload

    credentials = service_account.Credentials.from_service_account_file(
        "service-account.json",
        scopes=["https://www.googleapis.com/auth/drive.file"],
    )
    drive_service = build("drive", "v3", credentials=credentials)

    media = MediaIoBaseUpload(io.BytesIO(pdf_bytes), mimetype="application/pdf")
    file_metadata = {"name": file_name}
    created_file = (
        drive_service.files()
        .create(body=file_metadata, media_body=media, fields="id, webViewLink")
        .execute()
    )
    return created_file.get("webViewLink", "")


@router.get("/google/export", response_model=GoogleExportResponse)
async def export_to_google_drive(resume_id: str, db: Session = Depends(get_db)):
    """Export a resume as PDF and upload it to Google Drive."""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if resume is None:
        raise HTTPException(status_code=404, detail="Resume not found")

    file_name = f"{(resume.name or 'resume').replace(' ', '_')}.pdf"

    pdf_bytes = generate_resume_pdf(resume)

    try:
        drive_link = _upload_pdf_to_drive(file_name, pdf_bytes)
    except Exception as exc:  # noqa: BLE001 - keep API alive if Drive/creds unavailable
        logger.error("Google Drive export failed for resume %s: %s", resume_id, exc)
        # MVP degrade-safe fallback: no service-account credentials configured yet.
        drive_link = ""

    return GoogleExportResponse(drive_link=drive_link, file_name=file_name)
