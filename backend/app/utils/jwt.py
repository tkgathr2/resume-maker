"""JWT access tokens and refresh-token encryption/hashing helpers."""

import base64
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.config import settings


# --------------------------------------------------------------------------- #
# Access tokens (JWT / HS256)
# --------------------------------------------------------------------------- #
def create_access_token(user_id: int, email: str) -> str:
    """Create a signed JWT access token for the given user."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "email": email,
        "iat": now,
        "exp": now + timedelta(hours=settings.jwt_expiration_hours),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT access token.

    Raises jwt.PyJWTError (or a subclass) on invalid/expired tokens; the caller
    is expected to catch it and return an appropriate HTTP error.
    """
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])


# --------------------------------------------------------------------------- #
# Refresh tokens
# --------------------------------------------------------------------------- #
def _derive_key() -> bytes:
    """Derive a 32-byte AES-256 key from the configured encryption secret."""
    return hashlib.sha256(settings.refresh_token_encryption_key.encode("utf-8")).digest()


def create_refresh_token() -> str:
    """Generate a random opaque refresh token (returned raw to the client)."""
    return secrets.token_urlsafe(48)


def encrypt_refresh_token(raw: str) -> str:
    """Encrypt a refresh token with AES-256-GCM.

    A random 12-byte nonce is prepended to the ciphertext and the combination
    is base64-encoded into a single round-trippable string.
    """
    aesgcm = AESGCM(_derive_key())
    nonce = secrets.token_bytes(12)
    ciphertext = aesgcm.encrypt(nonce, raw.encode("utf-8"), None)
    return base64.b64encode(nonce + ciphertext).decode("utf-8")


def decrypt_refresh_token(token: str) -> str:
    """Decrypt a token produced by :func:`encrypt_refresh_token`."""
    data = base64.b64decode(token.encode("utf-8"))
    nonce, ciphertext = data[:12], data[12:]
    aesgcm = AESGCM(_derive_key())
    return aesgcm.decrypt(nonce, ciphertext, None).decode("utf-8")


def hash_refresh_token(raw: str) -> str:
    """Deterministic SHA-256 hash (hex) of a plaintext refresh token.

    Stored in an indexed column so /auth/refresh can look up the owning user
    directly (AES-GCM ciphertext is non-deterministic and cannot be searched).
    """
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()
