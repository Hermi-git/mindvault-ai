from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from uuid import UUID


@dataclass(slots=True)
class Document:
    """
    Represents one uploaded knowledge source owned by an organization.
    """

    id: UUID
    org_id: UUID
    title: str
    source_type: str  # pdf | markdown | text | url
    storage_url: str
    checksum: str | None = None
    status: str = "PENDING"  # PENDING | PROCESSING | READY | FAILED
    metadata: dict[str, Any] = field(default_factory=dict)
    chunk_count: int = 0
    token_count: int = 0
    error_message: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
