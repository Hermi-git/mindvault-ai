"""Shim — use ``app.infrastructure.celery_app`` (this re-exports the same instance)."""

from app.infrastructure.celery_app import celery_app

__all__ = ["celery_app"]
