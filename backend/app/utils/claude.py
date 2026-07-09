"""Anthropic Claude (Haiku) résumé review helper."""

import json
import logging
import anthropic
from anthropic import APIError, APITimeoutError, RateLimitError

from app.config import settings

logger = logging.getLogger(__name__)

_MODEL = "claude-3-5-haiku-20241022"


async def review_resume(content: str) -> str:
    """Ask Claude Haiku to review a résumé and return the review text.

    Fails at call time (not import/startup time) if no API key is configured.
    Raises appropriate exceptions on timeout/rate limit.
    """
    if not settings.claude_api_key:
        raise RuntimeError("CLAUDE_API_KEY is not configured")

    client = anthropic.AsyncAnthropic(api_key=settings.claude_api_key)
    prompt = f"次の履歴書を添削してください。改善点を箇条書きで。\n\n{content}"

    try:
        response = await client.messages.create(
            model=_MODEL,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text
    except APITimeoutError as e:
        logger.error("Claude API timeout while reviewing resume: %s", str(e))
        raise
    except RateLimitError as e:
        logger.error("Claude API rate limit exceeded: %s", str(e))
        raise
    except APIError as e:
        logger.error("Claude API error: %s", str(e))
        raise


async def generate_resume(raw_content: str) -> dict:
    """Generate a structured resume from raw content using Claude Haiku.

    Returns a dict with name, email, phone, summary, skills, experience, etc.
    """
    if not settings.claude_api_key:
        raise RuntimeError("CLAUDE_API_KEY is not configured")

    client = anthropic.AsyncAnthropic(api_key=settings.claude_api_key)
    prompt = f"""以下の内容から構造化された履歴書JSONを生成してください。
必ずJSON形式で以下のフィールドを含めてください:
- name (氏名)
- email (メール)
- phone (電話)
- summary (自己紹介)
- skills (スキルリスト)
- experience (経歴リスト)

内容:
{raw_content}

JSON形式で出力してください。"""

    try:
        response = await client.messages.create(
            model=_MODEL,
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
        )
        response_text = response.content[0].text

        # Extract JSON from response
        try:
            # Try to parse the entire response as JSON
            return json.loads(response_text)
        except json.JSONDecodeError:
            # If not pure JSON, try to extract JSON from the response
            import re
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            # Fallback: create a basic structure
            return {
                "name": "Unknown",
                "email": "",
                "phone": "",
                "summary": response_text,
                "skills": [],
                "experience": []
            }
    except APITimeoutError as e:
        logger.error("Claude API timeout while generating resume: %s", str(e))
        raise
    except RateLimitError as e:
        logger.error("Claude API rate limit exceeded: %s", str(e))
        raise
    except APIError as e:
        logger.error("Claude API error: %s", str(e))
        raise

