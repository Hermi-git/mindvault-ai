from __future__ import annotations

from functools import lru_cache

from redis.asyncio import Redis

from app.adapters.outbound.ai.local_embedder import AsyncLocalBGEAdapter
from app.adapters.outbound.db.repositories.document_repository_impl import (
    ChunkRepositoryImpl,
    DocumentRepositoryImpl,
    SyncChunkRepositoryImpl,
    SyncDocumentRepositoryImpl,
)
from app.adapters.outbound.db.repositories.password_hasher_impl import BcryptPasswordHasher
from app.adapters.outbound.db.repositories.token_provider_impl import JwtTokenProvider
from app.adapters.outbound.db.repositories.uow_impl import SQLAlchemyUnitOfWork
from app.adapters.outbound.db.session import SessionFactory
from app.adapters.outbound.email.email_sender import NullEmailSender, SmtpEmailSender
from app.adapters.outbound.loaders.docx_loader import DocxDocumentLoader
from app.adapters.outbound.loaders.pdf_loader import PDFDocumentLoader
from app.adapters.outbound.loaders.text_loader import TextDocumentLoader
from app.adapters.outbound.storage.local_storage import LocalObjectStorage
from app.adapters.outbound.vector.pinecone_store import PineconeVectorStore
from app.application.services.iam_service import IAMService
from app.application.services.ingestion_service import IngestionService
from app.application.use_cases.ingest_document import IngestDocumentService
from app.application.use_cases.login_user_service import LoginUserService
from app.application.use_cases.process_document_chunks import ProcessDocumentChunksService
from app.application.use_cases.register_user_service import RegisterUserService
from app.application.use_cases.switch_org_service import SwitchOrganizationService
from app.domain.ports.outbound.chunk_repository import ChunkRepository
from app.domain.ports.outbound.document_loader import DocumentLoaderRegistry
from app.domain.ports.outbound.document_repository import DocumentRepository
from app.domain.ports.outbound.email_sender import EmailSender
from app.domain.ports.outbound.object_storage import ObjectStorage
from app.domain.services.chunking_policy import ChunkingConfig
from app.infrastructure.config import settings
from app.infrastructure.security.redis_services import InvitationService, ThrottleService, TokenService


def get_uow_factory():
    return lambda: SQLAlchemyUnitOfWork(SessionFactory)


def get_password_hasher():
    return BcryptPasswordHasher()


def get_token_provider():
    return JwtTokenProvider(
        secret=settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
        issuer=settings.jwt_issuer,
        audience=settings.jwt_audience,
    )


def get_redis_client() -> Redis:
    return Redis.from_url(settings.redis_url, decode_responses=True)


def get_token_service() -> TokenService:
    return TokenService(
        get_redis_client(),
        keys=settings.jwt_keys,
        active_kid=settings.jwt_active_kid,
        issuer=settings.jwt_issuer,
        audience=settings.jwt_audience,
    )


def get_throttle_service() -> ThrottleService:
    return ThrottleService(
        get_redis_client(),
        soft_limit=settings.login_soft_lock_threshold,
        hard_limit=settings.login_hard_lock_threshold,
        soft_ttl=settings.login_soft_lock_seconds,
        hard_ttl=settings.login_hard_lock_seconds,
    )


def get_invitation_service() -> InvitationService:
    signing_secret = settings.invitation_signing_secret or settings.jwt_secret
    return InvitationService(secret=signing_secret, issuer=settings.jwt_issuer)


def get_email_sender() -> EmailSender:
    if not settings.use_smtp_email_delivery:
        return NullEmailSender()
    return SmtpEmailSender(
        host=settings.smtp_host,
        port=settings.smtp_port,
        username=(settings.smtp_username or "").strip() or None,
        password=settings.smtp_password_for_auth,
        use_tls=settings.smtp_use_tls,
        from_email=settings.smtp_from_email,
        from_name=settings.smtp_from_name or "MindVault AI",
    )


def get_iam_service() -> IAMService:
    return IAMService(
        session_factory=SessionFactory,
        token_service=get_token_service(),
        throttle_service=get_throttle_service(),
        invitation_service=get_invitation_service(),
        password_hasher=get_password_hasher(),
        frontend_base_url=settings.frontend_base_url,
        access_ttl_seconds=settings.access_token_ttl_seconds,
        refresh_ttl_seconds=settings.refresh_token_ttl_seconds,
        mfa_attempt_ttl_seconds=settings.mfa_attempt_ttl_seconds,
    )


def get_register_user_service():
    return RegisterUserService(
        uow_factory=get_uow_factory(),
        password_hasher=get_password_hasher(),
    )


def get_login_user_service():
    return LoginUserService(
        uow_factory=get_uow_factory(),
        password_hasher=get_password_hasher(),
        token_provider=get_token_provider(),
        access_token_ttl_seconds=settings.access_token_ttl_seconds,
        refresh_token_ttl_seconds=settings.refresh_token_ttl_seconds,
    )


def get_switch_org_service():
    return SwitchOrganizationService(
        uow_factory=get_uow_factory(),
        token_provider=get_token_provider(),
        access_token_ttl_seconds=settings.access_token_ttl_seconds,
        refresh_token_ttl_seconds=settings.refresh_token_ttl_seconds,
    )


# ---------------------------------------------------------------------------
# Document ingestion wiring
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def get_object_storage() -> ObjectStorage:
    """Singleton local-disk storage; swap for S3/Supabase here when ready."""
    return LocalObjectStorage(base_dir=settings.document_storage_dir)


@lru_cache(maxsize=1)
def get_document_loader_registry() -> DocumentLoaderRegistry:
    return DocumentLoaderRegistry(
        loaders=[
            TextDocumentLoader(),
            PDFDocumentLoader(),
            DocxDocumentLoader(),
        ]
    )


@lru_cache(maxsize=1)
def get_chunking_config() -> ChunkingConfig:
    return ChunkingConfig(
        chunk_size_chars=settings.document_chunk_size_chars,
        chunk_overlap_chars=settings.document_chunk_overlap_chars,
    )


def get_document_repository() -> DocumentRepository:
    return DocumentRepositoryImpl(session_factory=SessionFactory)


def get_chunk_repository() -> ChunkRepository:
    return ChunkRepositoryImpl(session_factory=SessionFactory)


def _enqueue_process_document(*, document_id: str) -> None:
    """Send a Celery message to ingest and process the given document.

    Imported lazily to avoid circular imports during ``celery_app`` bootstrap.
    Uses the new ingestion task that handles parsing, chunking, embedding, and vector storage.
    """
    from app.application.tasks.ingestion_tasks import ingest_document_task

    ingest_document_task.delay(document_id=document_id)


def get_ingest_document_service() -> IngestDocumentService:
    return IngestDocumentService(
        document_repository=get_document_repository(),
        object_storage=get_object_storage(),
        enqueue_processing=_enqueue_process_document,
        max_size_bytes=settings.document_max_size_bytes,
        allowed_source_types=settings.document_allowed_source_types,
    )


def get_process_document_chunks_service() -> ProcessDocumentChunksService:
    return ProcessDocumentChunksService(
        document_repository=SyncDocumentRepositoryImpl(),
        chunk_repository=SyncChunkRepositoryImpl(),
        object_storage=get_object_storage(),
        loader_registry=get_document_loader_registry(),
        chunking_config=get_chunking_config(),
    )


@lru_cache(maxsize=1)
def get_embedder() -> AsyncLocalBGEAdapter:
    """Singleton embedder for text-to-vector conversion."""
    return AsyncLocalBGEAdapter(model_name="BAAI/bge-small-en-v1.5")


@lru_cache(maxsize=1)
def get_vector_store() -> PineconeVectorStore:
    """Singleton Pinecone vector store."""
    return PineconeVectorStore(
        api_key=settings.pinecone_api_key,
        index_name=settings.pinecone_index_name,
    )


def get_ingestion_service() -> IngestionService:
    """Get the ingestion service with all dependencies."""
    return IngestionService(
        storage=get_object_storage(),
        repository=get_document_repository(),
        parser=None,  # Not used, IngestionService uses ParserFactory internally
        embedder=get_embedder(),
        vector_store=get_vector_store(),
        uow_factory=get_uow_factory(),
    )
