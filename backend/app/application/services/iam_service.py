from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.adapters.outbound.db.sqlalchemy_models import (
    AuditLogORM,
    OrganizationORM,
    OrganizationMembershipORM,
    RefreshTokenORM,
    UserORM,
)
from app.domain.value_objects.membership_status import MembershipStatus
from app.domain.value_objects.user_role import UserRole
from app.infrastructure.security.redis_services import InvitationService, ThrottleService, TokenService


class IAMService:
    def __init__(
        self,
        *,
        session_factory: async_sessionmaker,
        token_service: TokenService,
        throttle_service: ThrottleService,
        invitation_service: InvitationService,
        password_hasher,
        access_ttl_seconds: int,
        refresh_ttl_seconds: int,
        mfa_attempt_ttl_seconds: int,
    ) -> None:
        self._session_factory = session_factory
        self._token_service = token_service
        self._throttle_service = throttle_service
        self._invitation_service = invitation_service
        self._password_hasher = password_hasher
        self._access_ttl_seconds = access_ttl_seconds
        self._refresh_ttl_seconds = refresh_ttl_seconds
        self._mfa_attempt_ttl_seconds = mfa_attempt_ttl_seconds

    async def _audit(self, *, event_type: str, actor_id: UUID | None, org_id: UUID | None, ip_address: str | None, user_agent: str | None, metadata: dict | None = None, target_user_id: UUID | None = None) -> None:
        async with self._session_factory() as session:
            session.add(
                AuditLogORM(
                    id=uuid4(),
                    event_type=event_type,
                    actor_id=actor_id,
                    org_id=org_id,
                    target_user_id=target_user_id,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    metadata_json=metadata or {},
                )
            )
            await session.commit()

    async def login(self, *, email: str, password: str, org_slug: str | None, ip_address: str | None, user_agent: str | None) -> dict:
        ip = ip_address or "unknown"
        async with self._session_factory() as session:
            user = (await session.execute(select(UserORM).where(UserORM.email == email))).scalar_one_or_none()
            if not user or not user.password_hash or not self._password_hasher.verify_password(plain_password=password, hashed_password=user.password_hash):
                throttle = await self._throttle_service.register_login_failure(ip=ip, username=email)
                await self._audit(event_type="LOGIN_FAIL", actor_id=user.id if user else None, org_id=None, ip_address=ip_address, user_agent=user_agent, metadata=throttle)
                raise ValueError("Invalid credentials")
            if not user.is_active:
                raise ValueError("User account is disabled")

            membership_stmt = select(OrganizationMembershipORM).where(
                OrganizationMembershipORM.user_id == user.id,
                OrganizationMembershipORM.status == MembershipStatus.ACTIVE.value,
            )
            if org_slug:
                membership_stmt = membership_stmt.join(
                    OrganizationORM, OrganizationORM.id == OrganizationMembershipORM.org_id
                ).where(OrganizationORM.slug == org_slug)
            memberships = (await session.execute(membership_stmt)).scalars().all()
            membership = memberships[0] if memberships else None
            if not membership:
                raise ValueError("No active organization membership")

            await self._throttle_service.clear_login_failures(ip=ip, username=email)
            user.last_login_at = datetime.now(timezone.utc)
            await session.commit()

            if user.mfa_enabled:
                mfa_token = await self._token_service.issue_access(
                    claims={"sub": str(user.id), "org_id": str(membership.org_id), "role": str(membership.role), "mfa": "pending"},
                    ttl_seconds=self._mfa_attempt_ttl_seconds,
                )
                return {"mfa_required": True, "mfa_attempt_token": mfa_token, "expires_in_seconds": self._mfa_attempt_ttl_seconds}

            claims = {"sub": str(user.id), "org_id": str(membership.org_id), "role": str(membership.role)}
            access = await self._token_service.issue_access(claims=claims, ttl_seconds=self._access_ttl_seconds)
            refresh, refresh_jti, family = await self._token_service.issue_refresh(claims=claims, ttl_seconds=self._refresh_ttl_seconds)
            session.add(
                RefreshTokenORM(
                    id=uuid4(),
                    user_id=user.id,
                    org_id=membership.org_id,
                    token_family=family,
                    jti=refresh_jti,
                    expires_at=datetime.now(timezone.utc) + timedelta(seconds=self._refresh_ttl_seconds),
                )
            )
            await session.commit()
            await self._audit(event_type="LOGIN_SUCCESS", actor_id=user.id, org_id=membership.org_id, ip_address=ip_address, user_agent=user_agent)
            return {"access_token": access, "refresh_token": refresh, "token_type": "bearer"}

    async def refresh(self, *, refresh_token: str) -> dict:
        claims = self._token_service.decode(refresh_token)
        rotated = await self._token_service.rotate_refresh(
            presented_jti=claims["jti"],
            user_id=claims["sub"],
            org_id=claims["org_id"],
            role=claims["role"],
            access_ttl=self._access_ttl_seconds,
            refresh_ttl=self._refresh_ttl_seconds,
        )
        return {"access_token": rotated["access_token"], "refresh_token": rotated["refresh_token"], "token_type": "bearer"}

    async def logout(self, *, access_claims: dict) -> None:
        exp = int(access_claims["exp"])
        now = int(datetime.now(timezone.utc).timestamp())
        await self._token_service.revoke_access(jti=access_claims["jti"], ttl_seconds=max(1, exp - now))

    async def create_invitation(self, *, actor_claims: dict, org_id: UUID, email: str, role: str, ttl_seconds: int) -> str:
        if str(actor_claims["org_id"]) != str(org_id):
            raise ValueError("Cross-tenant access denied")
        return self._invitation_service.issue(org_id=str(org_id), email=email, role=role, expires_in_seconds=ttl_seconds)

    async def accept_invitation(self, *, token: str, user_id: UUID) -> None:
        payload = self._invitation_service.verify(token)
        async with self._session_factory() as session:
            existing = (
                await session.execute(
                    select(OrganizationMembershipORM).where(
                        OrganizationMembershipORM.org_id == UUID(payload["org_id"]),
                        OrganizationMembershipORM.user_id == user_id,
                    )
                )
            ).scalar_one_or_none()
            if existing:
                existing.status = MembershipStatus.ACTIVE.value
                existing.role = payload["role"].lower()
            else:
                session.add(
                    OrganizationMembershipORM(
                        id=uuid4(),
                        org_id=UUID(payload["org_id"]),
                        user_id=user_id,
                        role=payload["role"].lower(),
                        status=MembershipStatus.ACTIVE.value,
                    )
                )
            await session.commit()

    async def list_org_members(self, *, actor_claims: dict, org_id: UUID, page: int, page_size: int) -> dict:
        if str(actor_claims["org_id"]) != str(org_id):
            raise ValueError("Cross-tenant access denied")
        offset = max(0, (page - 1) * page_size)
        async with self._session_factory() as session:
            rows = (
                await session.execute(
                    select(OrganizationMembershipORM)
                    .where(OrganizationMembershipORM.org_id == org_id)
                    .order_by(OrganizationMembershipORM.created_at.desc())
                    .offset(offset)
                    .limit(page_size)
                )
            ).scalars().all()
            total = (
                await session.execute(
                    select(func.count()).select_from(OrganizationMembershipORM).where(
                        OrganizationMembershipORM.org_id == org_id
                    )
                )
            ).scalar_one()
        items = [
            {"user_id": str(r.user_id), "org_id": str(r.org_id), "role": r.role.upper(), "status": r.status.upper()}
            for r in rows
        ]
        return {"items": items, "total": int(total), "page": page, "page_size": page_size}

    async def patch_member(self, *, actor_claims: dict, org_id: UUID, user_id: UUID, role: str | None, status: str | None) -> dict:
        if str(actor_claims["org_id"]) != str(org_id):
            raise ValueError("Cross-tenant access denied")
        async with self._session_factory() as session:
            row = (
                await session.execute(
                    select(OrganizationMembershipORM).where(
                        OrganizationMembershipORM.org_id == org_id,
                        OrganizationMembershipORM.user_id == user_id,
                    )
                )
            ).scalar_one_or_none()
            if not row:
                raise ValueError("Membership not found")
            if role:
                row.role = role.lower()
            if status:
                row.status = status.lower()
            await session.commit()
            return {"user_id": str(row.user_id), "org_id": str(row.org_id), "role": row.role.upper(), "status": row.status.upper()}

    async def delete_member(self, *, actor_claims: dict, org_id: UUID, user_id: UUID) -> None:
        if str(actor_claims["org_id"]) != str(org_id):
            raise ValueError("Cross-tenant access denied")
        async with self._session_factory() as session:
            await session.execute(
                delete(OrganizationMembershipORM).where(
                    OrganizationMembershipORM.org_id == org_id,
                    OrganizationMembershipORM.user_id == user_id,
                )
            )
            await session.commit()
