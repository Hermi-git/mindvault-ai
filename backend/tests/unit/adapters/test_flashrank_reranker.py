"""Unit tests for the FlashRank reranker adapter (model stubbed)."""

from __future__ import annotations

import pytest

from app.adapters.outbound.rerank.flashrank_reranker import FlashRankReranker
from app.domain.value_objects.document import Document


def _doc(doc_id: str, text: str) -> Document:
    return Document(id=doc_id, text=text, score=0.5, source="hybrid")


def _make_reranker(ranking: list[tuple[int, float]]) -> FlashRankReranker:
    # Build without loading the ONNX model; inject a deterministic ranking.
    reranker = FlashRankReranker.__new__(FlashRankReranker)
    reranker._ranker = None
    reranker._model_name = "stub"
    reranker._rank = lambda query, documents: ranking  # type: ignore[attr-defined]
    return reranker


@pytest.mark.unit
@pytest.mark.asyncio
async def test_flashrank_reorders_by_relevance() -> None:
    docs = [_doc("a", "alpha"), _doc("b", "beta"), _doc("c", "gamma")]
    # Model says doc index 2 is most relevant, then 0, then 1.
    reranker = _make_reranker([(2, 0.9), (0, 0.6), (1, 0.3)])
    result = await reranker.rerank(query="q", documents=docs, top_k=2)
    assert [d.id for d in result] == ["c", "a"]
    assert result[0].source == "reranked"
    assert result[0].rerank_score == 0.9


@pytest.mark.unit
@pytest.mark.asyncio
async def test_flashrank_empty_documents() -> None:
    reranker = _make_reranker([])
    assert await reranker.rerank(query="q", documents=[], top_k=5) == []


@pytest.mark.unit
@pytest.mark.asyncio
async def test_flashrank_clamps_scores_into_unit_range() -> None:
    docs = [_doc("a", "alpha")]
    reranker = _make_reranker([(0, 1.7)])
    result = await reranker.rerank(query="q", documents=docs, top_k=1)
    assert result[0].score == 1.0
