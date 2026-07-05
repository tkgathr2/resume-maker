"""Encryption utilities for storing sensitive tokens (e.g. Google refresh tokens)."""

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings


def _derive_fernet_key(raw_key: str) -> bytes:
    """Derive a valid 32-byte urlsafe-base64 Fernet key from an arbitrary secret string."""
    digest = hashlib.sha256(raw_key.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


def _get_fernet() -> Fernet:
    key = _derive_fernet_key(settings.refresh_token_encryption_key)
    return Fernet(key)


def encrypt_token(plain_text: str) -> str:
    """Encrypt a plaintext token (e.g. refresh token) for storage."""
    f = _get_fernet()
    encrypted = f.encrypt(plain_text.encode("utf-8"))
    return encrypted.decode("utf-8")


def decrypt_token(encrypted_text: str) -> str:
    """Decrypt a previously encrypted token. Raises ValueError if invalid."""
    f = _get_fernet()
    try:
        decrypted = f.decrypt(encrypted_text.encode("utf-8"))
    except InvalidToken as exc:
        raise ValueError("Invalid or corrupted encrypted token") from exc
    return decrypted.decode("utf-8")
