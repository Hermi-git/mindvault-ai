"""Integration tests for the readiness probe."""

from __future__ import annotations

import pytest


@pytest.mark.integration
def test_liveness_still_ok(api_client) -> None:
    response = api_client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.integration
def test_readiness_reports_each_dependency(api_client) -> None:
    response = api_client.get("/health/ready")
    # 200 when every dependency is reachable, 503 otherwise — both are valid
    # depending on whether Postgres/Redis are up in the test environment.
    assert response.status_code in (200, 503)
    body = response.json()
    assert set(body["checks"].keys()) == {"postgres", "redis", "pinecone"}
    # Pinecone is unconfigured in tests, so it must be skipped (not failed).
    assert body["checks"]["pinecone"]["status"] == "skipped"
