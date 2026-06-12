from __future__ import annotations

import logging
from functools import lru_cache
from typing import Callable, List, Tuple

from app.domain.services.chunking_policy import estimate_token_count
from app.domain.value_objects.document import Document

logger = logging.getLogger(__name__)


@lru_cache(maxsize=8)
def _token_counter(model: str) -> Callable[[str], int]:
    try:
        import tiktoken

        try:
            encoding = tiktoken.encoding_for_model(model)
        except KeyError:
            encoding = tiktoken.get_encoding("cl100k_base")

        return lambda text: len(encoding.encode(text))
    except Exception:  # pragma: no cover - exercised only without tiktoken
        logger.warning(
            "tiktoken unavailable; falling back to char-based token estimate"
        )
        return estimate_token_count


def count_tokens(text: str, *, model: str = "gpt-4o-mini") -> int:
    if not text:
        return 0
    return _token_counter(model)(text)


def build_context(
    chunks: List[Document],
    *,
    max_tokens: int,
    model: str = "gpt-4o-mini",
    separator: str = "\n\n",
) -> Tuple[str, List[Document]]:
    if max_tokens <= 0:
        raise ValueError("max_tokens must be > 0")

    count = _token_counter(model)
    sep_tokens = count(separator)

    used: List[Document] = []
    parts: List[str] = []
    total = 0

    for chunk in chunks:
        text = chunk.text or ""
        chunk_tokens = count(text)
        projected = total + chunk_tokens + (sep_tokens if parts else 0)
        if parts and projected > max_tokens:
            continue
        parts.append(text)
        used.append(chunk)
        total = projected

    logger.debug(
        "Built context: %d/%d chunks, ~%d tokens (budget=%d)",
        len(used),
        len(chunks),
        total,
        max_tokens,
    )
    return separator.join(parts), used
