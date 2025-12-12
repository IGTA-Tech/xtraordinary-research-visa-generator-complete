"""
Application configuration from environment variables
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # API Keys
    ANTHROPIC_API_KEY: str
    OPENAI_API_KEY: Optional[str] = None
    MISTRAL_API_KEY: Optional[str] = None
    PERPLEXITY_API_KEY: Optional[str] = None
    SENDGRID_API_KEY: Optional[str] = None
    API2PDF_API_KEY: Optional[str] = None

    # Email
    SENDGRID_FROM_EMAIL: str = "noreply@visapetition.app"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://localhost/visa_petition"

    # CORS
    CORS_ORIGINS: str = "*"

    # App
    DEBUG: bool = False

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
