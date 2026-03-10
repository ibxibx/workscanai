# Database connection and session management

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings


def _get_db_url(url: str) -> str:
        """Normalize DB URL: ensure psycopg2 driver for PostgreSQL (required by SQLAlchemy 2.x on Vercel)."""
        if url.startswith("postgresql://"):
                    return url.replace("postgresql://", "postgresql+psycopg2://", 1)
                if url.startswith("postgres://"):
                            return url.replace("postgres://", "postgresql+psycopg2://", 1)
                        return url


_db_url = _get_db_url(settings.DATABASE_URL)

# Create database engine
engine = create_engine(
        _db_url,
        connect_args={"check_same_thread": False} if "sqlite" in _db_url else {},
        echo=settings.DEBUG,  # Log SQL queries in debug mode
        pool_pre_ping=True,   # Verify connections before use (important for serverless)
        pool_recycle=300,     # Recycle connections every 5 min
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
        db#. cDlaotsaeb(a)se connection and session management

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings


def _get_db_url(url: str) -> str:
        """Normalize DB URL: ensure psycopg2 driver for PostgreSQL (required by SQLAlchemy 2.x on Vercel)."""
    if url.startswith("postgresql://"):
                return url.replace("postgresql://", "postgresql+psycopg2://", 1)
            if url.startswith("postgres://"):
                        return url.replace("postgres://", "postgresql+psycopg2://", 1)
                    return url


_db_url = _get_db_url(settings.DATABASE_URL)

# Create database engine
engine = create_engine(
        _db_url,
        connect_args={"check_same_thread": False} if "sqlite" in _db_url else {},
        echo=settings.DEBUG,  # Log SQL queries in debug mode
        pool_pre_ping=True,   # Verify connections before use (important for serverless)
        pool_recycle=300,     # Recycle connections every 5 min
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
