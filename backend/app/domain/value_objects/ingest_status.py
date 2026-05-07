"""Ingestion status state machine for documents.

Lifecycle:
    PENDING    -> a document row exists, file uploaded, not yet processed.
    PROCESSING -> a worker has picked it up and is loading/chunking.
    READY      -> chunks persisted, available for retrieval / search.
    FAILED     -> processing errored; ``error_message`` should be set.
"""

from __future__ import annotations

from enum import StrEnum


class IngestStatus(StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"
