"""Sync DB access for Celery workers (psycopg2).

The FastAPI app uses ``asyncpg`` + ``AsyncSession`` (see ``session.py``). Celery
prefork workers must **not** reuse that async engine: asyncpg connections are
bound to a specific asyncio loop, and ``asyncio.run()`` per task creates a new
loop → "Future attached to a different loop" / "Event loop is closed".

Workers use a separate **synchronous** engine built from the same ``DATABASE_URL``
by swapping ``+asyncpg`` for ``+psycopg2`` (``psycopg2-binary`` is already a
dependency).
"""

from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.infrastructure.config import settings

_engine = None
_SessionLocal: sessionmaker[Session] | None = None


def sync_database_url(async_url: str) -> str:
    if "+asyncpg" in async_url:
        return async_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
    return async_url


def _get_sessionmaker() -> sessionmaker[Session]:
    global _engine, _SessionLocal
    if _SessionLocal is None:
        _engine = create_engine(
            sync_database_url(settings.database_url),
            pool_pre_ping=True,
            pool_size=2,
            max_overflow=2,
        )
        _SessionLocal = sessionmaker(
            bind=_engine, expire_on_commit=False, class_=Session
        )
    return _SessionLocal


def worker_session() -> Session:
    """Return a new sync session (caller must ``commit`` / ``rollback`` / ``close``)."""
    return _get_sessionmaker()()
