"""Celery task that processes (loads + chunks) an uploaded document.

The task is intentionally tiny: it builds the sync use case via the DI
provider and delegates. Retries cover transient storage / DB hiccups.
"""

from __future__ import annotations

import logging
from uuid import UUID

from celery import shared_task

logger = logging.getLogger(__name__)

TASK_NAME = "mindvault.documents.process_document"


@shared_task(
    name=TASK_NAME,
    bind=True,
    autoretry_for=(OSError, ConnectionError),
    retry_backoff=10,
    retry_kwargs={"max_retries": 3},
)
def process_document_task(self, *, document_id: str) -> int:
    """Process a single document by id. Returns the number of chunks produced."""
    from app.infrastructure.di.providers import get_process_document_chunks_service

    service = get_process_document_chunks_service()
    logger.info("Worker picked document %s for processing", document_id)
    return service.execute(document_id=UUID(document_id))
