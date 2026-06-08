"""get_current_claims must reject partial 'mfa pending' tokens."""

from __future__ import annotations

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.infrastructure.security import auth


class FakeTokenService:
    def __init__(self, claims: dict) -> None:
        self._claims = claims

    def decode(self, token: str) -> dict:
        return dict(self._claims)

    async def is_access_revoked(self, *, jti: str) -> bool:
        return False

    async def is_user_globally_revoked(self, *, user_id: str, iat: int) -> bool:
        return False


def _creds() -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials="tok")


@pytest.mark.unit
@pytest.mark.asyncio
async def test_pending_mfa_token_rejected(monkeypatch) -> None:
    claims = {
        "sub": "u1",
        "org_id": "o1",
        "type": "access",
        "mfa": "pending",
        "jti": "j1",
        "iat": 1_700_000_000,
    }
    monkeypatch.setattr(auth, "get_token_service", lambda: FakeTokenService(claims))
    with pytest.raises(HTTPException) as exc:
        await auth.get_current_claims(credentials=_creds())
    assert exc.value.status_code == 401
    assert "MFA" in exc.value.detail


@pytest.mark.unit
@pytest.mark.asyncio
async def test_full_access_token_accepted(monkeypatch) -> None:
    claims = {
        "sub": "u1",
        "org_id": "o1",
        "type": "access",
        "jti": "j1",
        "iat": 1_700_000_000,
    }
    monkeypatch.setattr(auth, "get_token_service", lambda: FakeTokenService(claims))
    result = await auth.get_current_claims(credentials=_creds())
    assert result["sub"] == "u1"
