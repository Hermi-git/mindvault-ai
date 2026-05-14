import logging
from uuid import UUID

from app.domain.entities.document import DocumentStatus
from app.adapters.outbound.parser import ParserFactory
from app.domain.services.chunking_policy import ChunkingConfig

logger = logging.getLogger(__name__)


class IngestionService:
    def __init__(self, storage, repository, parser, embedder, vector_store, uow_factory):
        self._storage = storage
        self._repository = repository
        self._parser_factory = ParserFactory()
        self._embedder = embedder
        self._vector_store = vector_store
        self._uow_factory = uow_factory
        self._chunking_config = ChunkingConfig()

    async def process_document(self, document_id: str | UUID) -> None:
        if isinstance(document_id, str):
            document_id = UUID(document_id)
        
        document = None
        try:
            async with self._uow_factory() as uow:
                document = await uow.documents.get(document_id)
                if not document:
                    raise ValueError(f"Document with id {document_id} not found")
                
                document.status = DocumentStatus.PROCESSING
                await uow.documents.update(document)
                await uow.commit()

            logger.info("Processing document %s (%s)", document_id, document.title)
            
            file_stream = await self._storage.download(document.storage_url)
            if not self._parser_factory.is_supported(document.storage_url):
                raise ValueError(f"Unsupported file type for document {document_id}")
            
            text = self._parser_factory.extract_text(file_stream, document.storage_url)
            logger.debug("Extracted %d characters from document %s", len(text), document_id)

            chunks = self._chunking_config.chunk_text(text)
            logger.debug("Created %d chunks for document %s", len(chunks), document_id)
            
            embeddings = await self._embedder.embed_texts(chunks)
            if not embeddings or len(embeddings) != len(chunks):
                raise ValueError(f"Failed to generate embeddings for all chunks in document {document_id}")

            pinecone_payload = []
            for i, (chunk_text, vector) in enumerate(zip(chunks, embeddings)):
                pinecone_payload.append({
                    "id": f"{document_id}_{i}",
                    "values": vector,
                    "metadata": {
                        "document_id": str(document_id),
                        "chunk_index": i,
                        "text": chunk_text,
                        "title": document.title,
                    }
                })

            await self._vector_store.upsert(vectors=pinecone_payload, namespace=str(document.org_id))
            logger.info("Upserted %d vectors for document %s", len(pinecone_payload), document_id)

            async with self._uow_factory() as uow:
                document.status = DocumentStatus.READY
                document.chunk_count = len(chunks)
                await uow.documents.update(document)
                await uow.commit()
            
            logger.info("Document %s processing completed successfully", document_id)
        
        except Exception as e:
            logger.exception("Document %s processing failed", document_id)
            if document:
                try:
                    async with self._uow_factory() as uow:
                        document.status = DocumentStatus.FAILED
                        document.error_message = f"Processing failed: {str(e)[:500]}"
                        await uow.documents.update(document)
                        await uow.commit()
                except Exception as update_err:
                    logger.exception("Failed to mark document %s as failed", document_id)
            
            raise


            





            