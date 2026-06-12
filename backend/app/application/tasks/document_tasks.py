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
    from app.infrastructure.di.providers import get_process_document_chunks_service

    service = get_process_document_chunks_service()
    task_id = getattr(self.request, "id", None)
    logger.info(
        "Worker picked document for processing",
        extra={"doc_id": document_id, "task_id": task_id},
    )
    try:
        return service.execute(document_id=UUID(document_id))
    except Exception as exc:
        logger.exception(
            "Document processing failed",
            extra={
                "doc_id": document_id,
                "task_id": task_id,
                "error": str(exc),
                "error_type": type(exc).__name__,
                "retries": getattr(self.request, "retries", None),
            },
        )
        raise
