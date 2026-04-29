from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from uuid import UUID


@dataclass(slots=True)
class UsageEvent:
    """
    Tracks billable or rate-limit-relevant actions for analytics.
    """

    id: UUID
    org_id: UUID
    user_id: UUID | None
    event_type: str  # chat_completion | embedding | upload | search
    provider: str | None = None  # openai | anthropic | pinecone...
    model: str | None = None
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    request_units: int = 1
    latency_ms: int | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: datetime | None = None
