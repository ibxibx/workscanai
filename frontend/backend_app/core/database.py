# Database connection and session management
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from backend_app.core.config import settings


def _get_db_url(url: str) -> str:
    """Normalize DB URL: ensure psycopg2 driver for PostgreSQL."""
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg2://", 1)
    return url


_db_url = _get_db_url(settings.DATABASE_URL)
_is_postgres = "postgresql" in _db_url or "postgres" in _db_url

# For serverless (Vercel + pgbouncer), use NullPool to avoid connection pool
# conflicts. pgbouncer manages the pool externally in transaction mode.
if _is_postgres:
    engine = create_engine(
        _db_url,
        poolclass=NullPool,
        echo=settings.DEBUG,
    )
else:
    # SQLite for local dev
    engine = create_engine(
        _db_url,
        connect_args={"check_same_thread": False},
        echo=settings.DEBUG,
    )

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
