from __future__ import annotations
from uuid import uuid4

from app.domain.entities.organization import Organization
from app.domain.entities.organization_membership import OrganizationMembership
from app.domain.entities.user import User
from app.domain.ports.inbound.auth.registration_inbound_contracts import (
    RegisterUserCommand,
    RegisterUserResult,
    RegisterUserUseCase,
)
from app.domain.ports.outbound.password_hasher import PasswordHasher
from app.domain.value_objects.membership_status import MembershipStatus
from app.domain.value_objects.user_role import UserRole

class RegisterUserService(RegisterUserUseCase):
    def __init__(self, *, uow_factory, password_hasher: PasswordHasher) -> None:
        self._uow_factory = uow_factory
        self._password_hasher = password_hasher

    async def execute(self, command: RegisterUserCommand) -> RegisterUserResult:
        async with self._uow_factory() as uow:
            existing = await uow.users.get_user_by_email(email=command.email)
            if existing:
                raise ValueError("Email already exists")

            user = User(
                id=uuid4(),
                email=command.email,
                full_name=command.full_name,
                password_hash=self._password_hasher.hash_password(plain_password=command.password),
            )
            await uow.users.create_user(user=user)

            default_org_id = None
            if command.organization_name:
                org = Organization(
                    id=uuid4(),
                    name=command.organization_name,
                    slug=command.organization_name.lower().replace(" ", "-"),
                )
                await uow.organizations.create_org(org=org)
                membership = OrganizationMembership(
                    id=uuid4(),
                    org_id=org.id,
                    user_id=user.id,
                    role=UserRole.OWNER,
                    status=MembershipStatus.ACTIVE,
                )
                await uow.memberships.create_membership(membership=membership)
                default_org_id = org.id

            await uow.commit()
            return RegisterUserResult(user_id=user.id, default_org_id=default_org_id)
