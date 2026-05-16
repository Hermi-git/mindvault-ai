from __future__ import annotations

import logging
from datetime import datetime
from typing import AsyncGenerator
from uuid import UUID

from app.domain.entities.chat_message import ChatMessage
from app.domain.ports.outbound.embedding_provider import EmbeddingProvider
from app.domain.ports.outbound.llm_port import LLMPort
from app.domain.ports.outbound.unit_of_work import UnitOfWork
from app.domain.ports.outbound.vector_store import VectorStore

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_TEMPLATE = (
    "You are MindVault AI, a helpful assistant grounded in the user's knowledge base. "
    "Use ONLY the context provided below to answer the user's question. "
    "If the answer is not in the context, say 'I don't have that information in my knowledge base.' "
    "Do not use your own training data to answer.\n\n"
    "Context:\n{context}"
)


class ChatService:
    def __init__(
        self,
        embedder: EmbeddingProvider,
        vector_store: VectorStore,
        llm: LLMPort,
        uow_factory: type,
    ) -> None:
        self._embedder = embedder
        self._vector_store = vector_store
        self._llm = llm
        self._uow_factory = uow_factory

    async def ask_question(
        self,
        *,
        session_id: UUID,
        org_id: UUID,
        user_id: UUID,
        user_query: str,
    ) -> AsyncGenerator[str, None]:
        query_vector = await self._embedder.embed_text(user_query)
        context_matches = await self._vector_store.query_by_similarity(
            query_vector=query_vector,
            org_id=str(org_id),
            top_k=5,
        )

        context_text = "\n".join(
            m["metadata"]["text"] for m in context_matches if m.get("metadata")
        )
        citations = [
            {
                "doc_id": m["metadata"]["document_id"],
                "title": m["metadata"].get("title", ""),
            }
            for m in context_matches
            if m.get("metadata")
        ]

        async with self._uow_factory() as uow:
            uow: UnitOfWork
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
            {"role": "system", "content": SYSTEM_PROMPT_TEMPLATE.format(context=context_text)},
            *[{"role": m.role, "content": m.content} for m in history],
            {"role": "user", "content": user_query},
        ]

        full_response = ""
        async for chunk in self._llm.generate_response_stream(messages=messages):
            full_response += chunk
            yield chunk

        async with self._uow_factory() as uow:
            uow: UnitOfWork
            ai_msg = ChatMessage.create_assistant_message(
                session_id=session_id,
                org_id=org_id,
                user_id=user_id,
                content=full_response,
                citations=citations,
                model_id=None,
            )
            await uow.messages.add_message(ai_msg)

            session = await uow.sessions.get_chat_session(session_id)
            session.last_message_at = datetime.now()
            await uow.sessions.update_chat_session(session)
            await uow.commit()
