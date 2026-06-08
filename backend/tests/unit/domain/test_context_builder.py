"""Unit tests for token-budgeted context construction."""

from __future__ import annotations

import pytest

from app.domain.services.context_builder import build_context, count_tokens
from app.domain.value_objects.document import Document


def _doc(doc_id: str, text: str) -> Document:
    return Document(id=doc_id, text=text, score=0.5, source="hybrid")


@pytest.mark.unit
def test_build_context_respects_token_budget() -> None:
    chunks = [_doc(f"d{i}", "word " * 50) for i in range(10)]
    text, used = build_context(chunks, max_tokens=60, model="gpt-4o-mini")
    assert 0 < len(used) < len(chunks)
    assert count_tokens(text, model="gpt-4o-mini") <= 60 + count_tokens(
        "word " * 50, model="gpt-4o-mini"
    )


@pytest.mark.unit
def test_build_context_keeps_order_and_includes_first() -> None:
    chunks = [_doc("a", "alpha"), _doc("b", "beta"), _doc("c", "gamma")]
    text, used = build_context(chunks, max_tokens=1000, model="gpt-4o-mini")
    assert [d.id for d in used] == ["a", "b", "c"]
    assert text.startswith("alpha")


@pytest.mark.unit
def test_build_context_always_includes_first_chunk_even_if_oversized() -> None:
    chunks = [_doc("big", "token " * 500), _doc("small", "tiny")]
    _, used = build_context(chunks, max_tokens=5, model="gpt-4o-mini")
    assert used[0].id == "big"
    assert len(used) == 1


@pytest.mark.unit
def test_build_context_rejects_nonpositive_budget() -> None:
    with pytest.raises(ValueError):
        build_context([_doc("a", "x")], max_tokens=0)


@pytest.mark.unit
def test_count_tokens_handles_empty() -> None:
    assert count_tokens("") == 0
    assert count_tokens("hello world") > 0
