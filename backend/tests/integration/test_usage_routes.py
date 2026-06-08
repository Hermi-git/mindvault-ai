"""Integration test for the usage reporting endpoint."""

from __future__ import annotations

import pytest

from app.infrastructure.di.container import Container
from app.main import app


@pytest.mark.integration
def test_get_usage_returns_monthly_totals(authed_client, test_org_id) -> None:
    class FakeUsageService:
        async def get_monthly_usage(self, *, org_id):
            return {
                "org_id": str(org_id),
                "period_start": "2026-06-01T00:00:00+00:00",
                "total_tokens": 1234,
                "total_documents": 5,
                "total_events": 7,
            }

    app.dependency_overrides[Container.get_usage_service] = lambda: FakeUsageService()
    try:
        response = authed_client.get(
            "/api/v1/usage", headers={"Authorization": "Bearer x"}
        )
    finally:
        app.dependency_overrides.pop(Container.get_usage_service, None)

    assert response.status_code == 200
    body = response.json()
    assert body["total_tokens"] == 1234
    assert body["total_documents"] == 5
    assert body["org_id"] == str(test_org_id)
