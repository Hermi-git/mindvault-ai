"""Unit tests for UsageService (DB session faked)."""

from __future__ import annotations

from uuid import uuid4

import pytest

from app.application.services.usage_service import UsageService


class FakeExecResult:
    def __init__(self, row) -> None:
        self._row = row

    def one(self):
        return self._row


class FakeSession:
    def __init__(self, store: list, row) -> None:
        self._store = store
        self._row = row

    async def __aenter__(self) -> "FakeSession":
        return self

    async def __aexit__(self, *args) -> None:
        return None

    def add(self, obj) -> None:
        self._store.append(obj)

    async def commit(self) -> None:
        pass

    async def execute(self, *_args, **_kwargs) -> FakeExecResult:
        return FakeExecResult(self._row)


def _factory(store: list, row=(0, 0, 0)):
    def session_factory():
        return FakeSession(store, row)

    return session_factory


@pytest.mark.unit
@pytest.mark.asyncio
async def test_record_persists_a_usage_row() -> None:
    store: list = []
    service = UsageService(session_factory=_factory(store))
    org_id = uuid4()
    await service.record(org_id=org_id, event_type="chat", token_count=120)
    assert len(store) == 1
    row = store[0]
    assert row.org_id == org_id
    assert row.event_type == "chat"
    assert row.token_count == 120
    assert row.document_count == 0


@pytest.mark.unit
@pytest.mark.asyncio
async def test_get_monthly_usage_aggregates() -> None:
    service = UsageService(session_factory=_factory([], row=(450, 3, 9)))
    result = await service.get_monthly_usage(org_id=uuid4())
    assert result["total_tokens"] == 450
    assert result["total_documents"] == 3
    assert result["total_events"] == 9
    assert "period_start" in result
