"""PDF generation router using reportlab (MVP-level plain template)."""

import io
import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Resume

logger = logging.getLogger(__name__)

router = APIRouter()


def generate_resume_pdf(resume: Resume) -> bytes:
    """Render a simple resume PDF (name, contact, job entries). No fancy design (MVP)."""
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    x_margin = 20 * mm
    y = height - 25 * mm

    c.setFont("Helvetica-Bold", 18)
    c.drawString(x_margin, y, resume.name or "Resume")
    y -= 10 * mm

    c.setFont("Helvetica", 11)
    contact_line = " / ".join(filter(None, [resume.email, resume.phone]))
    if contact_line:
        c.drawString(x_margin, y, contact_line)
        y -= 8 * mm

    if resume.summary:
        c.setFont("Helvetica-Bold", 12)
        c.drawString(x_margin, y, "Summary")
        y -= 6 * mm
        c.setFont("Helvetica", 10)
        c.drawString(x_margin, y, resume.summary[:120])
        y -= 10 * mm

    c.setFont("Helvetica-Bold", 12)
    c.drawString(x_margin, y, "Work Experience")
    y -= 8 * mm

    c.setFont("Helvetica", 10)
    for entry in resume.job_entries:
        if y < 25 * mm:
            c.showPage()
            y = height - 25 * mm
            c.setFont("Helvetica", 10)

        header = f"{entry.company} - {entry.job_title}"
        c.setFont("Helvetica-Bold", 11)
        c.drawString(x_margin, y, header)
        y -= 6 * mm

        date_range = f"{entry.start_date or ''} - {entry.end_date or ''}"
        c.setFont("Helvetica-Oblique", 9)
        c.drawString(x_margin, y, date_range)
        y -= 6 * mm

        c.setFont("Helvetica", 10)
        if entry.description:
            c.drawString(x_margin, y, entry.description[:150])
            y -= 10 * mm
        else:
            y -= 4 * mm

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.getvalue()


@router.get("/{resume_id}/pdf")
async def download_resume_pdf(resume_id: str, db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if resume is None:
        raise HTTPException(status_code=404, detail="Resume not found")

    pdf_bytes = generate_resume_pdf(resume)
    filename = f"{(resume.name or 'resume').replace(' ', '_')}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
