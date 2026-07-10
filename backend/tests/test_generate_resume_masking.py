"""Verify app.utils.claude.generate_resume() sends *masked* content to Haiku.

Regression test for the PII-masking pass added on top of Team C's
security-fixes PR: raw_content containing a name/phone/address must
never reach the Claude API prompt unmasked.
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.utils.claude import generate_resume


def _mock_anthropic_client(response_json: dict):
    """Build a fake `anthropic.AsyncAnthropic()` whose messages.create()
    returns `response_json` as the model's text content, and let the
    caller inspect what prompt it was called with.
    """
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text=json.dumps(response_json, ensure_ascii=False))]

    mock_client = MagicMock()
    mock_client.messages.create = AsyncMock(return_value=mock_response)
    return mock_client


class TestGenerateResumeMasksPii:
    @pytest.mark.asyncio
    async def test_raw_pii_never_reaches_the_prompt(self):
        raw_content = (
            "氏名: 田中太郎\n"
            "電話: 090-1234-5678\n"
            "住所: 東京都渋谷区神南1-2-3\n"
            "自己紹介: バックエンドエンジニアです。"
        )
        mock_client = _mock_anthropic_client(
            {
                "name": "[NAME]",
                "email": "",
                "phone": "[PHONE]",
                "summary": "バックエンドエンジニアです。",
                "skills": [],
                "experience": [],
            }
        )

        with patch("app.utils.claude.settings") as mock_settings:
            mock_settings.claude_api_key = "test-key"
            with patch("app.utils.claude.anthropic.AsyncAnthropic", return_value=mock_client):
                await generate_resume(raw_content)

        sent_prompt = mock_client.messages.create.call_args.kwargs["messages"][0]["content"]

        # Raw PII must be gone from what was actually sent to Haiku...
        assert "田中太郎" not in sent_prompt
        assert "090-1234-5678" not in sent_prompt
        assert "渋谷区神南1-2-3" not in sent_prompt
        # ...replaced with the masking placeholders.
        assert "[NAME]" in sent_prompt
        assert "[PHONE]" in sent_prompt
        assert "[ADDRESS]" in sent_prompt
        # Non-PII content is preserved so Haiku still has useful context.
        assert "バックエンドエンジニアです" in sent_prompt

    @pytest.mark.asyncio
    async def test_content_without_pii_is_unaffected(self):
        raw_content = "スキル: Python, FastAPI\n自己紹介: 5年間の経験があります。"
        mock_client = _mock_anthropic_client({"name": "Unknown", "email": "", "phone": ""})

        with patch("app.utils.claude.settings") as mock_settings:
            mock_settings.claude_api_key = "test-key"
            with patch("app.utils.claude.anthropic.AsyncAnthropic", return_value=mock_client):
                await generate_resume(raw_content)

        sent_prompt = mock_client.messages.create.call_args.kwargs["messages"][0]["content"]
        assert raw_content in sent_prompt
