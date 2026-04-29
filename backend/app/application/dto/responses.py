from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class RegisterResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    user_id: str
    default_org_id: str | None = None


class TokenPairResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class SwitchOrgResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    access_token: str
    refresh_token: str
    active_org_id: str


class MeResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    user_id: str
    org_id: str
    role: str


class MFAPartialResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    status: str = "MFA_REQUIRED"
    mfa_attempt_token: str
    expires_in_seconds: int


class InviteMemberResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    invitation_token: str
    invite_url: str


class MembersListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    items: list[dict]
    total: int
    page: int
    page_size: int
