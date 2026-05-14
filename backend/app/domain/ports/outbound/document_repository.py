"""Outbound port for the ``documents`` table.

Two surfaces:
  * ``DocumentRepository`` — async surface used by the API.
  * ``SyncDocumentRepository`` — sync surface used by Celery workers
    (psycopg2 + a sync session, see ``celery_worker_db.py``).
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from uuid import UUID

from app.domain.entities.document import Document


class DocumentRepository(ABC):
    @abstractmethod
    async def save(self, document: Document) -> None: ...

    @abstractmethod
    async def get_by_id(
        self, *, document_id: UUID, org_id: UUID | None = None
    ) -> Document | None: ...

    @abstractmethod
    async def delete(self, *, document_id: UUID, org_id: UUID) -> None: ...

    @abstractmethod
    async def list_by_org_id(
        self,
        *,
        org_id: UUID,
        page: int = 1,
        page_size: int = 20,
        status: str | None = None,
    ) -> tuple[list[Document], int]: ...

    @abstractmethod
    async def update_status(
        self,
        *,
        document_id: UUID,
        status: str,
        error_message: str | None = None,
        chunk_count: int | None = None,
        token_count: int | None = None,
    ) -> None: ...


class SyncDocumentRepository(ABC):
    @abstractmethod
    def get_by_id(self, *, document_id: UUID) -> Document | None: ...

    @abstractmethod
    def update_status(
        self,
        *,
        document_id: UUID,
        status: str,
        error_message: str | None = None,
        chunk_count: int | None = None,
        token_count: int | None = None,
    ) -> None: ...
