"""Anthropic Claude (Haiku) résumé review helper."""

import anthropic

from app.config import settings

_MODEL = "claude-3-5-haiku-20241022"


async def review_resume(content: str) -> str:
    """Ask Claude Haiku to review a résumé and return the review text.

    Fails at call time (not import/startup time) if no API key is configured.
    """
    if not settings.claude_api_key:
        raise RuntimeError("CLAUDE_API_KEY is not configured")

    client = anthropic.AsyncAnthropic(api_key=settings.claude_api_key)
    prompt = f"次の履歴書を添削してください。改善点を箇条書きで。\n\n{content}"
    response = await client.messages.create(
        model=_MODEL,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text
