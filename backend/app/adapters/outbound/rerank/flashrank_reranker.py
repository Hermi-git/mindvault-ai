"""Local cross-encoder reranker backed by FlashRank.

FlashRank runs a small ONNX cross-encoder on the CPU, so it needs no API key
and works out-of-the-box for demos. It sorts the fused candidate pool by true
query/passage relevance, keeping the best ``top_k`` for the prompt.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, List

from app.domain.ports.outbound.reranker import Reranker
from app.domain.value_objects.document import Document

logger = logging.getLogger(__name__)


class FlashRankReranker(Reranker):
    def __init__(self, model_name: str = "ms-marco-MiniLM-L-12-v2") -> None:
        from flashrank import Ranker

        self._ranker = Ranker(model_name=model_name)
        self._model_name = model_name
        logger.info("FlashRank reranker initialised with model %s", model_name)

    async def rerank(
        self, *, query: str, documents: List[Document], top_k: int = 5
    ) -> List[Document]:
        if not documents:
            return []

        ranked = await asyncio.to_thread(self._rank, query, documents)

        reranked: List[Document] = []
        for index, score in ranked[:top_k]:
            doc = documents[index]
            reranked.append(
                Document(
                    id=doc.id,
                    text=doc.text,
                    score=_clamp(score),
                    source="reranked",
                    metadata=doc.metadata,
                    vector_score=doc.vector_score,
                    key_score=doc.key_score,
                    rerank_score=score,
                    retrieval_sources=doc.retrieval_sources,
                )
            )
        return reranked

    def _rank(self, query: str, documents: List[Document]) -> List[tuple[int, float]]:
        from flashrank import RerankRequest

        passages: List[dict[str, Any]] = [
            {"id": i, "text": doc.text} for i, doc in enumerate(documents)
        ]
        results = self._ranker.rerank(RerankRequest(query=query, passages=passages))
        return [(int(r["id"]), float(r["score"])) for r in results]


def _clamp(score: float) -> float:
    if score < 0.0:
        return 0.0
    if score > 1.0:
        return 1.0
    return score
