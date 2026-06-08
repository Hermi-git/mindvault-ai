from __future__ import annotations

import asyncio
import logging

import sqlalchemy as sa
from fastapi import FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware

from app.adapters.inbound.api.v1 import (
    routes_auth,
    routes_chat,
    routes_documents,
    routes_search,
    routes_usage,
)
from app.adapters.outbound.db.session import engine
from app.infrastructure import celery_app
from app.infrastructure.config import settings
from app.infrastructure.di.providers import get_redis_client, get_vector_store

logger = logging.getLogger(__name__)

app = FastAPI(
    title="MindVault AI Backend",
    description="Multi-tenant RAG SaaS backend APIs",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes_auth.router, prefix="/api/v1")
app.include_router(routes_documents.router, prefix="/api/v1")
app.include_router(routes_chat.router, prefix="/api/v1")
app.include_router(routes_search.router, prefix="/api/v1")
app.include_router(routes_usage.router, prefix="/api/v1")


@app.get("/health", tags=["system"])
async def health() -> dict[str, str]:
    """Liveness probe — the process is up."""
    return {"status": "ok"}


async def _check_postgres() -> dict[str, str]:
    try:
        async with engine.connect() as conn:
            await conn.execute(sa.text("SELECT 1"))
        return {"status": "ok"}
    except Exception as exc:  # pragma: no cover - depends on live DB
        logger.warning("Postgres health check failed: %s", exc)
        return {"status": "error", "detail": str(exc)}


async def _check_redis() -> dict[str, str]:
    try:
        await get_redis_client().ping()
        return {"status": "ok"}
    except Exception as exc:  # pragma: no cover - depends on live Redis
        logger.warning("Redis health check failed: %s", exc)
        return {"status": "error", "detail": str(exc)}


async def _check_pinecone() -> dict[str, str]:
    if not settings.pinecone_api_key:
        return {"status": "skipped", "detail": "PINECONE_API_KEY not configured"}
    try:
        store = get_vector_store()
        await asyncio.to_thread(store._index.describe_index_stats)
        return {"status": "ok"}
    except Exception as exc:  # pragma: no cover - depends on live Pinecone
        logger.warning("Pinecone health check failed: %s", exc)
        return {"status": "error", "detail": str(exc)}


@app.get("/health/ready", tags=["system"])
async def readiness(response: Response) -> dict[str, object]:
    """Readiness probe — every backing dependency is reachable.

    Returns 200 only if Postgres, Redis, and Pinecone all report healthy.
    Unconfigured optional dependencies (e.g. Pinecone in local dev) report
    ``skipped`` and do not fail the probe.
    """
    postgres, redis_status, pinecone = await asyncio.gather(
        _check_postgres(), _check_redis(), _check_pinecone()
    )
    checks = {"postgres": postgres, "redis": redis_status, "pinecone": pinecone}
    healthy = all(c["status"] in ("ok", "skipped") for c in checks.values())
    if not healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return {"status": "ok" if healthy else "degraded", "checks": checks}


_ = celery_app
