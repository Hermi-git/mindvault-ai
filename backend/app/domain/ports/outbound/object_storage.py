from __future__ import annotations
from abc import ABC, abstractmethod


class ObjectStorage(ABC):
    @abstractmethod
    def put_object(
        self, *, key: str, data: bytes, content_type: str | None = None
    ) -> str:
        """Persist ``data`` under ``key``; return the canonical key actually stored."""

    @abstractmethod
    def get_object(self, *, key: str) -> bytes:
        """Return the raw bytes previously stored under ``key``."""

    @abstractmethod
    def delete_object(self, *, key: str) -> None:
        """Remove ``key`` if it exists; idempotent."""
