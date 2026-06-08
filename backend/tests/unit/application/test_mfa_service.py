"""Unit tests for IAMService MFA verification."""

from __future__ import annotations

from uuid import uuid4

import pytest

from app.application.services import iam_service as iam_module
from app.application.services.iam_service import IAMService


class FakeResult:
    def __init__(self, value) -> None:
        self._value = value

    def scalar_one_or_none(self):
        return self._value


class FakeSession:
    def __init__(self, user) -> None:
        self._user = user
        self.added: list = []

    async def __aenter__(self) -> "FakeSession":
        return self

    async def __aexit__(self, *args) -> None:
        return None

    async def execute(self, *_args, **_kwargs) -> FakeResult:
        return FakeResult(self._user)

    def add(self, obj) -> None:
        self.added.append(obj)

    async def commit(self) -> None:
        pass


class FakeTokenService:
    def __init__(self, claims: dict) -> None:
        self._claims = claims

    def decode(self, token: str) -> dict:
        return dict(self._claims)

    async def issue_access(self, *, claims, ttl_seconds) -> str:
        return "access-token"

    async def issue_refresh(self, *, claims, ttl_seconds, family_id=None):
        return "refresh-token", "jti-1", "family-1"


class FakeUser:
    def __init__(self, secret: str | None, is_active: bool = True) -> None:
        self.id = uuid4()
        self.email = "user@example.com"
        self.mfa_secret = secret
        self.is_active = is_active


class FakeTOTP:
    _accept = True

    def __init__(self, secret: str) -> None:
        self._secret = secret

    def verify(self, code: str, valid_window: int = 0) -> bool:
        return FakeTOTP._accept


def _build_service(*, user, claims) -> IAMService:
    def session_factory():
        return FakeSession(user)

    return IAMService(
        session_factory=session_factory,
        token_service=FakeTokenService(claims),
        throttle_service=None,
        invitation_service=None,
        password_hasher=None,
        frontend_base_url="http://x",
        access_ttl_seconds=3600,
        refresh_ttl_seconds=86400,
        mfa_attempt_ttl_seconds=300,
    )


_PENDING_CLAIMS = {
    "sub": str(uuid4()),
    "org_id": str(uuid4()),
    "role": "owner",
    "type": "access",
    "mfa": "pending",
    "jti": "j1",
}


@pytest.fixture(autouse=True)
def _reset_totp(monkeypatch):
    FakeTOTP._accept = True
    monkeypatch.setattr(iam_module.pyotp, "TOTP", FakeTOTP)
    yield


@pytest.mark.unit
@pytest.mark.asyncio
async def test_verify_mfa_success_returns_full_tokens() -> None:
    service = _build_service(user=FakeUser("SECRET"), claims=_PENDING_CLAIMS)
    result = await service.verify_mfa(mfa_attempt_token="t", code="123456")
    assert result["access_token"] == "access-token"
    assert result["refresh_token"] == "refresh-token"
    assert result["token_type"] == "bearer"


@pytest.mark.unit
@pytest.mark.asyncio
async def test_verify_mfa_bad_code_raises() -> None:
    FakeTOTP._accept = False
    service = _build_service(user=FakeUser("SECRET"), claims=_PENDING_CLAIMS)
    with pytest.raises(ValueError, match="Invalid MFA code"):
        await service.verify_mfa(mfa_attempt_token="t", code="000000")


@pytest.mark.unit
@pytest.mark.asyncio
async def test_verify_mfa_rejects_non_pending_token() -> None:
    claims = dict(_PENDING_CLAIMS)
    claims.pop("mfa")
    service = _build_service(user=FakeUser("SECRET"), claims=claims)
    with pytest.raises(ValueError, match="Invalid MFA token"):
        await service.verify_mfa(mfa_attempt_token="t", code="123456")


@pytest.mark.unit
@pytest.mark.asyncio
async def test_verify_mfa_no_secret_raises() -> None:
    service = _build_service(user=FakeUser(None), claims=_PENDING_CLAIMS)
    with pytest.raises(ValueError, match="not configured"):
        await service.verify_mfa(mfa_attempt_token="t", code="123456")
