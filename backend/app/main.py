from __future__ import annotations

# Load Celery app + shared_task registrations before routers import tasks (`.delay()`).
import app.infrastructure.celery_app  # noqa: F401

from fastapi import FastAPI

from app.adapters.inbound.api.v1 import routes_auth

app = FastAPI(
    title="MindVault AI Backend",
    description="Multi-tenant RAG SaaS backend APIs",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.include_router(routes_auth.router, prefix="/api/v1")


@app.get("/health", tags=["system"])
async def health() -> dict[str, str]:
    return {"status": "ok"}
