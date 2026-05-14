"""Outbound port for persisting/reading document chunks.

Two surfaces:
  * ``ChunkRepository`` (async) — used by API request handlers.
  * ``SyncChunkRepository`` (sync) — used by Celery workers via psycopg2 session
    (avoids asyncpg loop-binding issues).
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from uuid import UUID

from app.domain.entities.document_chunk import DocumentChunk


class ChunkRepository(ABC):
    @abstractmethod
    async def add_many(self, chunks: list[DocumentChunk]) -> None: ...

    @abstractmethod
    async def list_by_document(self, *, document_id: UUID) -> list[DocumentChunk]: ...

    @abstractmethod
    async def delete_by_document(self, *, document_id: UUID) -> None: ...


class SyncChunkRepository(ABC):
    @abstractmethod
    def add_many(self, chunks: list[DocumentChunk]) -> None: ...

    @abstractmethod
    def delete_by_document(self, *, document_id: UUID) -> None: ...
