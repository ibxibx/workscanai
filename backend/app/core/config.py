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
    
    # Database
    DATABASE_URL: str
    
    # AI/LLM
    ANTHROPIC_API_KEY: str
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    
    # Environment
    ENVIRONMENT: str = "development"

    # Bot protection
    MAX_ANALYSES_PER_HOUR: int = 5
    RECAPTCHA_SECRET_KEY: str = ""
    RECAPTCHA_MIN_SCORE: float = 0.5

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
