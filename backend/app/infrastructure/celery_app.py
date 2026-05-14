"""Celery application instance and worker entrypoint (-A app.infrastructure.celery_app).

Configuration comes from ``Settings`` (env / .env): broker URL, result backend,
queues, serializers. Task modules register **after** the app is constructed to
avoid import cycles (see trailing import).

Run a worker::
    celery -A app.infrastructure.celery_app worker --loglevel=info

Consume both default and email queues when you split traffic::
    celery -A app.infrastructure.celery_app worker --loglevel=info -Q default,email
"""

from __future__ import annotations

from celery import Celery

from app.infrastructure.config import settings

celery_app = Celery(
    "mindvault",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone=settings.celery_timezone,
    enable_utc=True,
    task_default_queue=settings.celery_task_default_queue,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_track_started=True,
    broker_connection_retry_on_startup=True,
)

# Optional: route email jobs to a dedicated queue (worker must listen with -Q ...).
if (
    settings.celery_email_queue
    and settings.celery_email_queue != settings.celery_task_default_queue
):
    celery_app.conf.task_routes = {
        "mindvault.email.send_organization_invitation": {
            "queue": settings.celery_email_queue
        },
    }

# Register task modules (``@shared_task`` binds them to this app when imported).
import app.application.tasks.audit_tasks  # noqa: E402
import app.application.tasks.document_tasks  # noqa: E402
import app.application.tasks.ingestion_tasks  # noqa: E402
import app.application.tasks.email_tasks  # noqa: E402

__all__ = ["celery_app"]
