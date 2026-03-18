"""
Database setup — local SQLite for dev, Turso cloud SQLite for production.

Set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN in Render env vars to activate
persistent cloud storage (free tier, no expiry, survives all redeploys).
Falls back to local SQLite when those vars are absent.
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.config import settings

Base = declarative_base()

_use_turso = bool(settings.TURSO_DATABASE_URL and settings.TURSO_AUTH_TOKEN)

if _use_turso:
    from app.core import turso_dbapi

    _url   = settings.TURSO_DATABASE_URL
    _token = settings.TURSO_AUTH_TOKEN

    # Use SQLite dialect (generates SQLite-compatible SQL) but override the
    # physical connection with our Turso HTTP shim via the creator= parameter.
    engine = create_engine(
        "sqlite+pysqlite://",        # dialect only — never actually opens a file
        creator=lambda: turso_dbapi.connect(_url, _token),
        poolclass=StaticPool,        # reuse one connection (Turso is stateless HTTP)
        connect_args={},
        echo=settings.DEBUG,
    )
    print("[turso] Persistent cloud database active:", _url)

else:
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=settings.DEBUG,
    )
    print("[sqlite] Local database:", settings.DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
