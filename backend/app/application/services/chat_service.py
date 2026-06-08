from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import AsyncGenerator
from uuid import UUID

from app.application.services.hybrid_search_service import HybridSearchService
from app.domain.entities.chat_message import ChatMessage
from app.domain.ports.outbound.llm_port import LLMPort
from app.domain.ports.outbound.reranker import Reranker
from app.domain.services.citation_policy import (
    extract_citations_from_chunks,
    rank_citations,
)
from app.domain.services.context_builder import build_context, count_tokens
from app.infrastructure.prompts.loader import SYSTEM_PROMPT_TEMPLATE

logger = logging.getLogger(__name__)


class ChatService:
    def __init__(
        self,
        hybrid_search: HybridSearchService,
        reranker: Reranker,
        llm: LLMPort,
        uow_factory: type,
        *,
        candidate_pool: int = 20,
        final_top_k: int = 5,
        context_max_tokens: int = 3000,
        model: str = "gpt-4o-mini",
        usage_service=None,
    ) -> None:
        self._hybrid_search = hybrid_search
        self._reranker = reranker
        self._llm = llm
        self._uow_factory = uow_factory
        self._candidate_pool = candidate_pool
        self._final_top_k = final_top_k
        self._context_max_tokens = context_max_tokens
        self._model = model
        self._usage_service = usage_service

    async def ask_question(
        self,
        *,
        session_id: UUID,
        org_id: UUID,
        user_id: UUID,
        user_query: str,
    ) -> AsyncGenerator[str, None]:
        # Retrieve a wide candidate pool, then rerank down to the few best
        # passages so the cross-encoder has real choices to work with.
        candidates = await self._hybrid_search.search(
            user_query=user_query,
            org_id=str(org_id),
            top_k=self._candidate_pool,
        )

        reranked = await self._reranker.rerank(
            query=user_query,
            documents=candidates,
            top_k=self._final_top_k,
        )

        # Trim to a token budget so we never overflow the context window. Build
        # citations from the chunks that actually survived trimming.
        context_text, used_chunks = build_context(
            reranked,
            max_tokens=self._context_max_tokens,
            model=self._model,
        )
        citations = rank_citations(extract_citations_from_chunks(used_chunks))
        citations_as_dicts = [c.__dict__ for c in citations]

        async with self._uow_factory() as uow:
            history = await uow.messages.get_recent_by_session(session_id, limit=6)

            user_msg = ChatMessage.create_user_message(
                session_id=session_id,
                org_id=org_id,
                user_id=user_id,
                content=user_query,
            )
            await uow.messages.add_message(user_msg)
            await uow.commit()

        messages = [
            {
                "role": "system",
                "content": SYSTEM_PROMPT_TEMPLATE.format(context=context_text),
            },
            *[{"role": m.role, "content": m.content} for m in history],
            {"role": "user", "content": user_query},
        ]

        full_response = ""
        async for chunk in self._llm.generate_response_stream(messages=messages):
            full_response += chunk
            yield _sse_event({"type": "token", "content": chunk})

        # Tell the client which sources backed the answer, then signal end.
        yield _sse_event({"type": "citations", "citations": citations_as_dicts})
        yield "data: [DONE]\n\n"

        prompt_tokens = count_tokens(context_text + user_query, model=self._model)
        answer_tokens = count_tokens(full_response, model=self._model)
        total_tokens = prompt_tokens + answer_tokens

        await self._persist_answer(
            session_id=session_id,
            org_id=org_id,
            user_id=user_id,
            content=full_response,
            citations=citations_as_dicts,
            token_count=total_tokens,
        )

        if self._usage_service is not None:
            try:
                await self._usage_service.record(
                    org_id=org_id,
                    event_type="chat",
                    token_count=total_tokens,
                    user_id=user_id,
                )
            except Exception:
                logger.exception("Failed to record chat usage for org %s", org_id)

    async def _persist_answer(
        self,
        *,
        session_id: UUID,
        org_id: UUID,
        user_id: UUID,
        content: str,
        citations: list[dict],
        token_count: int,
    ) -> None:
        async with self._uow_factory() as uow:
            ai_msg = ChatMessage.create_assistant_message(
                session_id=session_id,
                org_id=org_id,
                user_id=user_id,
                content=content,
                citations=citations,
                model_id=self._model,
                token_count=token_count,
            )
            await uow.messages.add_message(ai_msg)

            session = await uow.sessions.get_chat_session(session_id)
            session.last_message_at = datetime.now()
            await uow.sessions.update_chat_session(session)
            await uow.commit()


def _sse_event(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"
