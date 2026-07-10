"""AES-256-GCM encryption for 在留カード (residence card) sensitive fields.

Mirrors the nonce-prepended-ciphertext scheme already used for refresh
tokens in app/utils/jwt.py::encrypt_refresh_token: a random 12-byte nonce is
prepended to the GCM ciphertext and the pair is base64-encoded into a single
round-trippable string, so no separate IV column is needed on the model.

The AES-256 key is derived via SHA-256 from ``settings.zairyu_encryption_key``
(same derivation as ``refresh_token_encryption_key`` / ``jwt_secret``), so any
non-empty string works as the raw secret -- it does not need to itself be a
valid base64-encoded 32-byte value.
"""

import base64
import hashlib
import secrets

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.config import settings

_NONCE_BYTES = 12


def _derive_key() -> bytes:
    """Derive a 32-byte AES-256 key from ZAIRYU_ENCRYPTION_KEY."""
    return hashlib.sha256(settings.zairyu_encryption_key.encode("utf-8")).digest()


def encrypt_field(plaintext: str) -> str:
    """Encrypt a plaintext string with AES-256-GCM.

    Returns a single base64 string (nonce || ciphertext) safe to store in a
    ``Text`` column.
    """
    aesgcm = AESGCM(_derive_key())
    nonce = secrets.token_bytes(_NONCE_BYTES)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    return base64.b64encode(nonce + ciphertext).decode("utf-8")


def decrypt_field(token: str) -> str:
    """Decrypt a value produced by :func:`encrypt_field`.

    Raises ValueError if the token is malformed or fails authentication
    (wrong/rotated key, corrupted ciphertext).
    """
    try:
        data = base64.b64decode(token.encode("utf-8"))
        nonce, ciphertext = data[:_NONCE_BYTES], data[_NONCE_BYTES:]
        aesgcm = AESGCM(_derive_key())
        return aesgcm.decrypt(nonce, ciphertext, None).decode("utf-8")
    except Exception as exc:  # noqa: BLE001 - any failure means "can't decrypt"
        raise ValueError("Failed to decrypt zairyu card field") from exc


def hash_card_number(card_number: str) -> str:
    """Deterministic SHA-256 hex hash for duplicate-registration lookups.

    AES-GCM ciphertext is non-deterministic (random nonce per call), so an
    indexed plaintext-equality hash column is needed to detect the same
    card number being registered by two different job seekers -- mirrors
    ``User.refresh_token_hash``.
    """
    return hashlib.sha256(card_number.encode("utf-8")).hexdigest()


def mask_card_number(card_number: str) -> str:
    """Mask all but the last 4 characters, e.g. ``ZZAA1234B5678901`` -> ``************8901``."""
    if len(card_number) <= 4:
        return "*" * len(card_number)
    return "*" * (len(card_number) - 4) + card_number[-4:]
