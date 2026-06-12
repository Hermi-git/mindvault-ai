"""Unit tests for the Redis fixed-window rate limiter."""

from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.infrastructure.security.rate_limit import RateLimiter


class FakeRedis:
    def __init__(self) -> None:
        self._store: dict[str, int] = {}
        self.expired: list[str] = []

    async def incr(self, key: str) -> int:
        self._store[key] = self._store.get(key, 0) + 1
        return self._store[key]

    async def expire(self, key: str, seconds: int) -> None:
        self.expired.append(key)


class BrokenRedis:
    async def incr(self, key: str) -> int:
        raise ConnectionError("redis down")

    async def expire(self, key: str, seconds: int) -> None:
        raise ConnectionError("redis down")


@pytest.mark.unit
@pytest.mark.asyncio
async def test_allows_up_to_limit_then_blocks() -> None:
    limiter = RateLimiter(FakeRedis(), scope="chat", limit=2, window=60)
    await limiter.check("org-1")
    await limiter.check("org-1")
    with pytest.raises(HTTPException) as exc:
        await limiter.check("org-1")
    assert exc.value.status_code == 429
    assert "Retry-After" in exc.value.headers


@pytest.mark.unit
@pytest.mark.asyncio
async def test_separate_identities_have_separate_buckets() -> None:
    limiter = RateLimiter(FakeRedis(), scope="chat", limit=1, window=60)
    await limiter.check("org-1")
    await limiter.check("org-2")  # different org, still allowed


@pytest.mark.unit
@pytest.mark.asyncio
async def test_zero_limit_disables_limiter() -> None:
    limiter = RateLimiter(FakeRedis(), scope="chat", limit=0, window=60)
    for _ in range(100):
        await limiter.check("org-1")


@pytest.mark.unit
@pytest.mark.asyncio
async def test_fails_open_when_redis_unavailable() -> None:
    limiter = RateLimiter(BrokenRedis(), scope="chat", limit=1, window=60)
    # Must not raise even though the backend is broken.
    await limiter.check("org-1")
    await limiter.check("org-1")
