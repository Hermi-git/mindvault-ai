from __future__ import annotations

import asyncio
import logging

from celery import shared_task

logger = logging.getLogger(__name__)

TASK_NAME = "mindvault.documents.ingest_document"


@shared_task(
    name=TASK_NAME,
    bind=True,
    autoretry_for=(OSError, ConnectionError),
    retry_backoff=10,
    retry_kwargs={"max_retries": 3},
)
def ingest_document_task(self, *, document_id: str) -> str:
    from app.infrastructure.di.providers import get_ingestion_service

    logger.info("Worker picked document %s for ingestion", document_id)

    service = get_ingestion_service()

    try:
        asyncio.run(service.process_document(document_id=document_id))
        logger.info("Document %s ingestion completed successfully", document_id)
        return f"Document {document_id} ingested successfully"
    except Exception as e:
        logger.exception("Document %s ingestion failed", document_id)
        raise
