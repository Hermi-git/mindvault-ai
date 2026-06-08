"""Per-organization fixed-window rate limiting for expensive routes.

Keeps a Redis counter per ``(scope, org, window)``. The window is derived from
the wall clock so all replicas agree without coordination, and the counter
auto-expires. Used as a FastAPI dependency on ``/chat`` and ``/upload`` to stop
a single tenant from running up unbounded LLM / ingestion cost.
"""

from __future__ import annotations

import logging
import time
from typing import Callable

from fastapi import Depends, HTTPException, status

from app.infrastructure.di.providers import get_redis_client
from app.infrastructure.security.auth import get_current_claims

logger = logging.getLogger(__name__)


class RateLimiter:
    def __init__(self, redis, *, scope: str, limit: int, window: int) -> None:
        self._redis = redis
        self._scope = scope
        self._limit = limit
        self._window = window

    async def check(self, identity: str) -> None:
        if self._limit <= 0:
            return
        bucket = int(time.time()) // self._window
        key = f"ratelimit:{self._scope}:{identity}:{bucket}"
        try:
            count = await self._redis.incr(key)
            if count == 1:
                await self._redis.expire(key, self._window)
        except Exception:
            # Never let a Redis hiccup take down the protected route; fail open.
            logger.exception("Rate limiter backend error; allowing request")
            return

        if count > self._limit:
            retry_after = self._window - (int(time.time()) % self._window)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Rate limit exceeded for {self._scope}: "
                    f"{self._limit} requests per {self._window}s"
                ),
                headers={"Retry-After": str(retry_after)},
            )


def rate_limit(*, scope: str, limit: int, window: int) -> Callable:
    """Build a FastAPI dependency that enforces a per-org rate limit."""

    async def _dependency(claims: dict = Depends(get_current_claims)) -> None:
        identity = str(claims.get("org_id") or claims.get("sub") or "anonymous")
        limiter = RateLimiter(
            get_redis_client(), scope=scope, limit=limit, window=window
        )
        await limiter.check(identity)

    return _dependency
