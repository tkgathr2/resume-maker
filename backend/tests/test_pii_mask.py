"""Unit tests for the Presidio-based PII masking utility."""

from app.utils.pii_mask import mask_pii


class TestMaskPii:
    def test_masks_labeled_name(self):
        result = mask_pii("氏名: 田中太郎\n自己紹介: エンジニアです。")
        assert "田中太郎" not in result
        assert "[NAME]" in result

    def test_masks_phone_number(self):
        result = mask_pii("電話: 090-1234-5678")
        assert "090-1234-5678" not in result
        assert "[PHONE]" in result

    def test_masks_address(self):
        result = mask_pii("住所: 東京都渋谷区神南1-2-3")
        assert "渋谷区神南1-2-3" not in result
        assert "[ADDRESS]" in result

    def test_masks_all_pii_together(self):
        raw = (
            "氏名: 山田花子\n"
            "電話: 03-1234-5678\n"
            "住所: 大阪府大阪市北区梅田1-1-1\n"
            "自己紹介: 5年間のエンジニア経験があります。"
        )
        result = mask_pii(raw)

        assert "山田花子" not in result
        assert "03-1234-5678" not in result
        assert "大阪市北区梅田1-1-1" not in result
        assert "[NAME]" in result
        assert "[PHONE]" in result
        assert "[ADDRESS]" in result
        # Non-PII content must survive masking untouched.
        assert "5年間のエンジニア経験があります" in result

    def test_leaves_non_pii_text_untouched(self):
        text = "スキル: Python, FastAPI, PostgreSQL"
        assert mask_pii(text) == text

    def test_empty_string_returns_unchanged(self):
        assert mask_pii("") == ""

    def test_whitespace_only_returns_unchanged(self):
        assert mask_pii("   \n  ") == "   \n  "
