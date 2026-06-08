"""Unit tests for RAG chat application service."""

from __future__ import annotations

import json
from uuid import uuid4

import pytest

from app.application.services.chat_service import ChatService
from app.domain.value_objects.document import Document
from tests.helpers.mocks import FakeUoW


def _parse_sse(events: list[str]) -> tuple[str, list, bool]:
    """Return (joined tokens, citations, done-seen) from SSE event strings."""
    tokens: list[str] = []
    citations: list = []
    done = False
    for raw in events:
        payload = raw.removeprefix("data: ").strip()
        if payload == "[DONE]":
            done = True
            continue
        data = json.loads(payload)
        if data["type"] == "token":
            tokens.append(data["content"])
        elif data["type"] == "citations":
            citations = data["citations"]
    return "".join(tokens), citations, done


class FakeHybridSearch:
    async def search(self, **kwargs) -> list[Document]:
        return [
            Document(
                id="doc-1",
                text="context snippet",
                score=0.8,
                source="hybrid",
                metadata={"document_id": "doc-1", "title": "Doc"},
            )
        ]


class FakeReranker:
    async def rerank(self, **kwargs) -> list[Document]:
        return kwargs["documents"]


class FakeLLM:
    async def generate_response_stream(self, *, messages, temperature=0.7):
        yield "Hello "
        yield "world"


class FakeMessageRepo:
    async def get_recent_by_session(self, session_id, limit=6):
        return []

    async def add_message(self, message):
        self.last = message


class FakeSessionRepo:
    async def get_chat_session(self, session_id):
        class Session:
            last_message_at = None

        return Session()

    async def update_chat_session(self, session):
        pass


class FakeSessionUoW(FakeUoW):
    def __init__(self) -> None:
        super().__init__()
        self.messages = FakeMessageRepo()
        self.sessions = FakeSessionRepo()


@pytest.mark.unit
@pytest.mark.asyncio
async def test_chat_service_streams_llm_tokens() -> None:
    uow = FakeSessionUoW()
    service = ChatService(
        hybrid_search=FakeHybridSearch(),
        reranker=FakeReranker(),
        llm=FakeLLM(),
        uow_factory=lambda: uow,
    )
    chunks = []
    async for part in service.ask_question(
        session_id=uuid4(),
        org_id=uuid4(),
        user_id=uuid4(),
        user_query="What is MindVault?",
    ):
        chunks.append(part)
    text, citations, done = _parse_sse(chunks)
    assert text == "Hello world"
    assert done is True
    assert isinstance(citations, list)
    assert uow.committed


@pytest.mark.unit
@pytest.mark.asyncio
async def test_chat_service_emits_citations_event() -> None:
    uow = FakeSessionUoW()
    service = ChatService(
        hybrid_search=FakeHybridSearch(),
        reranker=FakeReranker(),
        llm=FakeLLM(),
        uow_factory=lambda: uow,
    )
    events = [
        part
        async for part in service.ask_question(
            session_id=uuid4(),
            org_id=uuid4(),
            user_id=uuid4(),
            user_query="What is MindVault?",
        )
    ]
    # A terminal citations event must be present so the frontend can render
    # sources alongside the streamed answer.
    assert any('"type": "citations"' in e for e in events)
    saved = uow.messages.last
    assert saved.role == "assistant"
    assert saved.token_count is not None and saved.token_count > 0
