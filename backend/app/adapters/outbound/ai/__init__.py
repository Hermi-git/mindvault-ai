"""AI service adapters (embeddings, LLM providers, etc.)."""

from app.adapters.outbound.ai.local_embedder import (
    AsyncLocalBGEAdapter,
    SyncLocalBGEAdapter,
)

__all__ = ["AsyncLocalBGEAdapter", "SyncLocalBGEAdapter"]
