"""Slack integration: outbound notifications + inbound message capture.

Mounted under the /integrations prefix in main.py (matches docs/API_SPEC.md:
POST /integrations/slack/notify). An extra inbound endpoint is added for
receiving Slack messages that should auto-fill a resume form.
"""

import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import SlackMessage
from app.schemas import (
    SlackNotifyRequest,
    SlackNotifyResponse,
    SlackInboundMessage,
    SlackMessageOut,
)

logger = logging.getLogger(__name__)

router = APIRouter()

VALID_ACTIONS = {"created", "updated", "deleted", "exported", "generated"}


@router.post("/slack/notify", response_model=SlackNotifyResponse)
async def notify_slack(payload: SlackNotifyRequest):
    """Send a notification to Slack via the configured Incoming Webhook."""
    if payload.action not in VALID_ACTIONS:
        raise HTTPException(status_code=400, detail="Invalid action")

    if not settings.slack_webhook_url:
        logger.warning("SLACK_WEBHOOK_URL not configured; skipping Slack notification")
        return SlackNotifyResponse(ok=False, message="Slack webhook not configured")

    text = f"[{payload.action}] {payload.message}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(settings.slack_webhook_url, json={"text": text})
            resp.raise_for_status()
    except httpx.HTTPError as exc:
        logger.error("Slack notification failed: %s", exc)
        raise HTTPException(status_code=500, detail="Slack API error") from exc

    return SlackNotifyResponse(ok=True, message="Notification sent")


@router.post("/slack/inbound", response_model=SlackMessageOut, status_code=201)
async def receive_slack_message(payload: SlackInboundMessage, db: Session = Depends(get_db)):
    """Receive an inbound Slack message and store it for later form auto-fill."""
    message = SlackMessage(
        resume_id=payload.resume_id,
        channel=payload.channel,
        raw_text=payload.text,
        processed=False,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return SlackMessageOut.model_validate(message)
