"""Outbound port for embedding text using local or remote providers.

Two surfaces:
  * ``EmbeddingProvider`` — async surface used by the API.
  * ``SyncEmbeddingProvider`` — sync surface used by Celery workers
    (psycopg2 + a sync session, see ``celery_worker_db.py``).
"""

from __future__ import annotations

from abc import ABC, abstractmethod


class EmbeddingProvider(ABC):
    """Async interface for generating text embeddings."""

    @abstractmethod
    async def embed_text(self, text: str) -> list[float]:
        """Embed a single text string.

        Args:
            text: The text to embed.

        Returns:
            A list of floats representing the embedding vector.
        """
        ...

    @abstractmethod
    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """Embed multiple text strings in batch.

        Args:
            texts: A list of texts to embed.

        Returns:
            A list of embedding vectors, one per input text.
        """
        ...


class SyncEmbeddingProvider(ABC):
    """Sync interface for generating text embeddings (Celery workers)."""

    @abstractmethod
    def embed_text(self, text: str) -> list[float]:
        """Embed a single text string.

        Args:
            text: The text to embed.

        Returns:
            A list of floats representing the embedding vector.
        """
        ...

    @abstractmethod
    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """Embed multiple text strings in batch.

        Args:
            texts: A list of texts to embed.

        Returns:
            A list of embedding vectors, one per input text.
        """
        ...
