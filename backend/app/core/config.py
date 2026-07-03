# Backend configuration using Pydantic Settings

from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path
from dotenv import load_dotenv
import os

# Load .env file from backend directory
backend_dir = Path(__file__).resolve().parent.parent.parent
load_dotenv(backend_dir / ".env")


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "WorkScanAI"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Database — defaults to local SQLite; set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN for persistent cloud DB
    DATABASE_URL: str = "sqlite:////tmp/workscan.db"
    TURSO_DATABASE_URL: str = ""   # e.g. libsql://your-db.turso.io
    TURSO_AUTH_TOKEN: str = ""
    
    # AI/LLM
    ANTHROPIC_API_KEY: str = ""
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,https://workscanai.vercel.app"
    
    # Environment
    ENVIRONMENT: str = "development"

    # Bot protection
    MAX_ANALYSES_PER_HOUR: int = 5
    RECAPTCHA_SECRET_KEY: str = ""
    RECAPTCHA_MIN_SCORE: float = 0.5

    # Admin auth — the ONE home for the admin secret. Read everywhere via
    # app.core.auth (never os.getenv scattered across routes, never a hardcoded
    # fallback). Empty default = admin endpoints reject all requests (fail closed).
    ADMIN_SECRET: str = ""

    # Owner IP — unlimited scans (set via .env / Render env var, never hardcoded)
    OWNER_IP: str = ""

    # Email (Resend) + links
    RESEND_API_KEY: str = ""
    FROM_EMAIL: str = "noreply@workscanai.com"
    APP_URL: str = "https://workscanai.vercel.app"

    # PostHog server-side analytics
    POSTHOG_API_KEY: str = ""
    POSTHOG_HOST: str = ""

    def require_production_secrets(self) -> list[str]:
        """Return the names of secrets that are REQUIRED in production but unset.
        Called at startup so a misconfigured prod deploy fails loud instead of
        silently running with broken auth. Never substitutes a real value."""
        if self.ENVIRONMENT != "production":
            return []
        required = {
            "ANTHROPIC_API_KEY": self.ANTHROPIC_API_KEY,
            "ADMIN_SECRET": self.ADMIN_SECRET,
        }
        return [name for name, val in required.items() if not val]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
