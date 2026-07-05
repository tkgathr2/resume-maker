"""Slack incoming-webhook notification helper."""

import httpx

from app.config import settings


async def send_slack_notification(message: str) -> bool:
    """POST a message to the configured Slack incoming webhook.

    Returns False (without raising) if the webhook is unconfigured or the POST
    fails, so a missing/broken webhook never breaks the calling request.
    """
    if not settings.slack_webhook_url:
        print("Slack webhook URL not configured; skipping notification.")
        return False

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                settings.slack_webhook_url, json={"text": message}
            )
            resp.raise_for_status()
        return True
    except httpx.HTTPError as exc:
        print(f"Slack notification failed: {exc}")
        return False
