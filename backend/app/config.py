"""Configuration management"""

from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    """Application settings from environment variables"""

    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/resume_maker"

    # OAuth
    google_client_id: str
    google_client_secret: str

    # API Keys
    openai_api_key: str
    # Anthropic Claude key (used for Haiku résumé review). Distinct from the
    # misleadingly-named `openai_api_key` above. Optional so the server can boot
    # without it; only fails at call time in utils/claude.py.
    claude_api_key: Optional[str] = None

    # Security
    jwt_secret: str = "your-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24
    refresh_token_encryption_key: str = "your-encryption-key-min-32-chars"

    # Slack
    slack_webhook_url: Optional[str] = None

    # Environment
    environment: str = "development"
    debug: bool = True

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_prefix: str = "/api/v1"

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
