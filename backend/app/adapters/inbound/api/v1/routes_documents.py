"""HTTP routes for the documents bounded context.

Endpoints:
    POST   /documents          multipart upload — accepts a file and queues processing.
    GET    /documents          paginated list scoped to caller's active org.
    GET    /documents/{id}     fetch one document (status/metadata).
    GET    /documents/{id}/chunks    list chunks (after status=ready).
    DELETE /documents/{id}     remove document, chunks, and its stored bytes.
"""

from __future__ import annotations

import logging
import mimetypes
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile, status

from app.application.dto.document_schemas import (
    DocumentChunkResponse,
    DocumentChunksResponse,
    DocumentListResponse,
    DocumentResponse,
)
from app.domain.entities.document import Document
from app.domain.ports.inbound.ingestion_use_case import IngestDocumentCommand
from app.domain.services.chunking_policy import estimate_token_count
from app.infrastructure.config import settings
from app.infrastructure.di.providers import (
    get_chunk_repository,
    get_document_repository,
    get_ingest_document_service,
    get_object_storage,
)
from app.infrastructure.security.auth import get_current_claims

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["documents"])


def _to_response(document: Document) -> DocumentResponse:
    return DocumentResponse(
        id=str(document.id),
        org_id=str(document.org_id),
        title=document.title,
        source_type=document.source_type,
        status=document.status.value,
        chunk_count=document.chunk_count,
        token_count=document.token_count,
        checksum=document.checksum,
        error_message=document.error_message,
        created_at=document.created_at,
        updated_at=document.updated_at,
    )


_DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def _infer_source_type(filename: str | None, content_type: str | None) -> str:
    """Map a (filename, MIME) pair to the canonical loader source_type.

    Filename extension wins over a vague ``application/octet-stream`` content
    type; explicit MIME types win otherwise.
    """
    if content_type:
        ct = content_type.lower()
        if ct == "application/pdf":
            return "pdf"
        if ct == _DOCX_MIME:
            return "docx"
        if ct in {"text/markdown", "text/x-markdown"}:
            return "markdown"
        if ct.startswith("text/"):
            return "text"
    if filename:
        guessed, _ = mimetypes.guess_type(filename)
        if guessed:
            if guessed == "application/pdf":
                return "pdf"
            if guessed == _DOCX_MIME:
                return "docx"
            if guessed in {"text/markdown", "text/x-markdown"}:
                return "markdown"
            if guessed.startswith("text/"):
                return "text"
        lower = filename.lower()
        if lower.endswith(".pdf"):
            return "pdf"
        if lower.endswith(".docx"):
            return "docx"
        if lower.endswith((".md", ".markdown")):
            return "markdown"
        if lower.endswith((".txt", ".text", ".log")):
            return "text"
    return "text"


@router.post(
    "",
    response_model=DocumentResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload a document for asynchronous chunking",
)
async def upload_document(
    file: UploadFile = File(..., description="The document file to ingest"),
    title: str | None = Form(default=None, description="Optional title (defaults to filename)"),
    source_type: str | None = Form(
        default=None,
        description="Override detected source type (e.g. text, markdown)",
    ),
    claims: dict = Depends(get_current_claims),
):
    org_id_str = claims.get("org_id")
    user_id_str = claims.get("sub")
    if not org_id_str:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No active organization")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")

    inferred_type = (source_type or _infer_source_type(file.filename, file.content_type)).lower()
    final_title = (title or file.filename or "document").strip()

    command = IngestDocumentCommand(
        org_id=UUID(org_id_str),
        uploaded_by_user_id=UUID(user_id_str) if user_id_str else None,
        title=final_title,
        source_type=inferred_type,
        content_type=file.content_type,
        data=raw,
    )

    service = get_ingest_document_service()
    try:
        document = await service.execute(command)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return _to_response(document)


@router.get("", response_model=DocumentListResponse, summary="List documents in active org")
async def list_documents(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: str | None = Query(
        default=None,
        alias="status",
        pattern="^(pending|processing|ready|failed)$",
    ),
    claims: dict = Depends(get_current_claims),
):
    org_id_str = claims.get("org_id")
    if not org_id_str:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No active organization")
    repo = get_document_repository()
    items, total = await repo.list_by_org_id(
        org_id=UUID(org_id_str),
        page=page,
        page_size=page_size,
        status=status_filter,
    )
    return DocumentListResponse(
        items=[_to_response(d) for d in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{document_id}", response_model=DocumentResponse, summary="Fetch document by id")
async def get_document(document_id: UUID, claims: dict = Depends(get_current_claims)):
    org_id_str = claims.get("org_id")
    if not org_id_str:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No active organization")
    repo = get_document_repository()
    doc = await repo.get_by_id(document_id=document_id, org_id=UUID(org_id_str))
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return _to_response(doc)


@router.get(
    "/{document_id}/chunks",
    response_model=DocumentChunksResponse,
    summary="List chunks produced for a document",
)
async def list_document_chunks(document_id: UUID, claims: dict = Depends(get_current_claims)):
    org_id_str = claims.get("org_id")
    if not org_id_str:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No active organization")
    doc_repo = get_document_repository()
    doc = await doc_repo.get_by_id(document_id=document_id, org_id=UUID(org_id_str))
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    chunk_repo = get_chunk_repository()
    chunks = await chunk_repo.list_by_document(document_id=document_id)
    return DocumentChunksResponse(
        document_id=str(document_id),
        items=[
            DocumentChunkResponse(
                id=str(c.id),
                chunk_index=c.chunk_index,
                content=c.content,
                content_hash=c.content_hash,
                token_count_estimate=estimate_token_count(c.content),
            )
            for c in chunks
        ],
        total=len(chunks),
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a document")
async def delete_document(document_id: UUID, claims: dict = Depends(get_current_claims)):
    import asyncio

    org_id_str = claims.get("org_id")
    if not org_id_str:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No active organization")
    repo = get_document_repository()
    doc = await repo.get_by_id(document_id=document_id, org_id=UUID(org_id_str))
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    await repo.delete(document_id=document_id, org_id=UUID(org_id_str))
    storage = get_object_storage()
    try:
        await asyncio.to_thread(storage.delete_object, key=doc.storage_url)
    except Exception:
        # File missing or transient FS error; we already removed the row.
        logger.exception("Failed to delete stored bytes for document %s", document_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# Settings reference kept so static analyzers see the import is intentional and
# the route file participates in any future config-validation hooks.
_ = settings
