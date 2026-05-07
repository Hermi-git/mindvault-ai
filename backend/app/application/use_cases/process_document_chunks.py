"""Worker-side use case: load a stored document and persist its chunks.

This runs in a Celery prefork worker, so it is **synchronous** end to end and
uses sync repositories backed by psycopg2 (see ``celery_worker_db.py``). That
sidesteps asyncpg event-loop pitfalls and matches Celery's threading model.
"""

from __future__ import annotations

import hashlib
import logging
from uuid import UUID, uuid4

from app.domain.entities.document import DocumentStatus
from app.domain.entities.document_chunk import DocumentChunk
from app.domain.ports.inbound.ingestion_use_case import ProcessDocumentChunksUseCase
from app.domain.ports.outbound.chunk_repository import SyncChunkRepository
from app.domain.ports.outbound.document_loader import DocumentLoaderRegistry
from app.domain.ports.outbound.document_repository import SyncDocumentRepository
from app.domain.ports.outbound.object_storage import ObjectStorage
from app.domain.services.chunking_policy import (
    ChunkingConfig,
    chunk_text,
    estimate_token_count,
)

logger = logging.getLogger(__name__)


class ProcessDocumentChunksService(ProcessDocumentChunksUseCase):
    def __init__(
        self,
        *,
        document_repository: SyncDocumentRepository,
        chunk_repository: SyncChunkRepository,
        object_storage: ObjectStorage,
        loader_registry: DocumentLoaderRegistry,
        chunking_config: ChunkingConfig,
    ) -> None:
        self._documents = document_repository
        self._chunks = chunk_repository
        self._storage = object_storage
        self._loaders = loader_registry
        self._chunking = chunking_config

    def execute(self, *, document_id: UUID) -> int:
        document = self._documents.get_by_id(document_id=document_id)
        if document is None:
            logger.warning("Document %s vanished before processing", document_id)
            return 0

        if document.status == DocumentStatus.READY:
            logger.info("Document %s already READY; skipping reprocess", document_id)
            return document.chunk_count

        self._documents.update_status(
            document_id=document_id,
            status=DocumentStatus.PROCESSING.value,
            error_message=None,
        )

        try:
            raw = self._storage.get_object(key=document.storage_url)
            text = self._loaders.load_text(data=raw, source_type=document.source_type)
            pieces = chunk_text(text, config=self._chunking)
            if not pieces:
                self._documents.update_status(
                    document_id=document_id,
                    status=DocumentStatus.READY.value,
                    chunk_count=0,
                    token_count=0,
                    error_message=None,
                )
                logger.info("Document %s produced 0 chunks (empty after normalization)", document_id)
                return 0

            self._chunks.delete_by_document(document_id=document_id)
            chunks = [
                DocumentChunk(
                    id=uuid4(),
                    org_id=document.org_id,
                    document_id=document.id,
                    chunk_index=i,
                    content=piece,
                    content_hash=hashlib.sha256(piece.encode("utf-8")).hexdigest(),
                    metadata={"source_type": document.source_type},
                )
                for i, piece in enumerate(pieces)
            ]
            self._chunks.add_many(chunks)

            token_count = sum(estimate_token_count(p) for p in pieces)
            self._documents.update_status(
                document_id=document_id,
                status=DocumentStatus.READY.value,
                chunk_count=len(chunks),
                token_count=token_count,
                error_message=None,
            )
            logger.info(
                "Document %s processed: %d chunks, ~%d tokens",
                document_id,
                len(chunks),
                token_count,
            )
            return len(chunks)
        except Exception as exc:  # noqa: BLE001 — surface every failure on the row
            logger.exception("Failed to process document %s", document_id)
            self._documents.update_status(
                document_id=document_id,
                status=DocumentStatus.FAILED.value,
                error_message=str(exc)[:2000],
            )
            raise
