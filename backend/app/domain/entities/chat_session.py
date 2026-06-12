from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4


@dataclass(slots=True)
class ChatSession:
    id: UUID
    org_id: UUID
    user_id: UUID
    title: str
    metadata: dict[str, Any] = field(default_factory=dict)
    last_message_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @staticmethod
    def create(
        *,
        org_id: UUID,
        user_id: UUID,
        title: str,
        metadata: dict[str, Any] | None = None,
    ) -> ChatSession:
        now = datetime.now(timezone.utc)
        return ChatSession(
            id=uuid4(),
            org_id=org_id,
            user_id=user_id,
            title=title,
            metadata=metadata or {},
            created_at=now,
            updated_at=now,
        )
