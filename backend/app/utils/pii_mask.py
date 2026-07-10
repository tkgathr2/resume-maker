"""Presidio-based PII masking for résumé free text.

Applied to raw résumé content before it is included in a Claude (Haiku)
prompt, so that raw names/phone numbers/addresses never leave our
infrastructure inside an LLM request.

Presidio's built-in recognizers are English/NLP-model driven (e.g. the
PERSON/LOCATION recognizers require a downloaded spaCy model such as
en_core_web_lg, and Japanese support additionally requires SudachiPy).
To keep this masking step dependency-light and deterministic (no model
download, works offline/in CI), we run Presidio with a blank,
model-free tokenizer and register custom regex-based recognizers tuned
for Japanese résumé content instead.
"""

import logging
import re
from functools import lru_cache

import spacy
from presidio_analyzer import (
    AnalyzerEngine,
    Pattern,
    PatternRecognizer,
    RecognizerRegistry,
)
from presidio_analyzer.nlp_engine import SpacyNlpEngine
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig

logger = logging.getLogger(__name__)

_LANG = "xx"  # spaCy's model-free multi-language tokenizer.

_NAME_LABELS = ["氏名", "お名前", "名前", "Name", "name"]
_NAME_COLONS = (":", "：")

_PHONE_PATTERN = Pattern(
    name="jp_phone",
    regex=r"0\d{1,4}-\d{1,4}-\d{3,4}|0\d{9,10}",
    score=0.85,
)

_ADDRESS_PATTERN = Pattern(
    name="jp_address",
    # Anchored on a Japanese prefecture name so we don't have to guess
    # at arbitrary kanji strings; captures the municipality/street text
    # that follows it.
    regex=r"(?:北海道|東京都|京都府|大阪府|.{2,3}県)[^\s、。,\.\n]{2,40}",
    score=0.7,
)


def _name_patterns() -> list[Pattern]:
    """Build one fixed-width-lookbehind pattern per label/colon combo.

    Python's `re` requires lookbehind groups to be fixed-width, so each
    label variant (氏名:/氏名：/お名前:/Name: ...) gets its own Pattern
    rather than a single alternation. This keeps the label text itself
    ("氏名:") in the output and masks only the value after it.
    """
    patterns = []
    for label in _NAME_LABELS:
        for colon in _NAME_COLONS:
            prefix = re.escape(label) + re.escape(colon)
            patterns.append(
                Pattern(
                    name=f"jp_name_{label}_{colon}",
                    regex=rf"(?<={prefix})\s*[^\s、,。\n]{{1,20}}",
                    score=0.85,
                )
            )
    return patterns


class _BlankSpacyNlpEngine(SpacyNlpEngine):
    """spaCy NLP engine backed by a blank (model-free) pipeline.

    We only need this for Presidio's internal tokenization step, not
    for NER, so `spacy.blank()` avoids requiring a downloaded model.
    """

    def load(self) -> None:
        self.nlp = {m["lang_code"]: spacy.blank(m["lang_code"]) for m in self.models}

    def is_loaded(self) -> bool:
        return self.nlp is not None


@lru_cache(maxsize=1)
def _get_analyzer() -> AnalyzerEngine:
    nlp_engine = _BlankSpacyNlpEngine(models=[{"lang_code": _LANG, "model_name": "blank"}])
    nlp_engine.load()

    registry = RecognizerRegistry(supported_languages=[_LANG])
    registry.add_recognizer(
        PatternRecognizer(
            supported_entity="JP_PERSON_NAME",
            patterns=_name_patterns(),
            supported_language=_LANG,
        )
    )
    registry.add_recognizer(
        PatternRecognizer(
            supported_entity="JP_PHONE_NUMBER",
            patterns=[_PHONE_PATTERN],
            supported_language=_LANG,
        )
    )
    registry.add_recognizer(
        PatternRecognizer(
            supported_entity="JP_ADDRESS",
            patterns=[_ADDRESS_PATTERN],
            supported_language=_LANG,
        )
    )

    return AnalyzerEngine(
        nlp_engine=nlp_engine,
        registry=registry,
        supported_languages=[_LANG],
    )


@lru_cache(maxsize=1)
def _get_anonymizer() -> AnonymizerEngine:
    return AnonymizerEngine()


_ENTITIES = ["JP_PERSON_NAME", "JP_PHONE_NUMBER", "JP_ADDRESS"]

_OPERATORS = {
    "JP_PERSON_NAME": OperatorConfig("replace", {"new_value": "[NAME]"}),
    "JP_PHONE_NUMBER": OperatorConfig("replace", {"new_value": "[PHONE]"}),
    "JP_ADDRESS": OperatorConfig("replace", {"new_value": "[ADDRESS]"}),
}


def mask_pii(text: str) -> str:
    """Replace names/phone numbers/addresses in `text` with placeholders.

    Returns the text unchanged if it's empty/whitespace-only. Fails
    *closed*: if Presidio itself errors, we raise rather than silently
    sending unmasked PII to Claude, since the whole point of this
    function is to guarantee the LLM prompt never sees raw PII.
    """
    if not text or not text.strip():
        return text

    try:
        analyzer_results = _get_analyzer().analyze(
            text=text, language=_LANG, entities=_ENTITIES
        )
        anonymized = _get_anonymizer().anonymize(
            text=text,
            analyzer_results=analyzer_results,
            operators=_OPERATORS,
        )
        return anonymized.text
    except Exception as e:
        logger.error("PII masking failed, refusing to send unmasked content: %s", str(e))
        raise RuntimeError("PII masking failed") from e
