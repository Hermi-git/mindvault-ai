from __future__ import annotations
from abc import ABC, abstractmethod

from app.domain.ports.outbound.user_repository import UserRepository
from app.domain.ports.outbound.organization_repository import OrganizationRepository
from app.domain.ports.outbound.membership_repository import MembershipRepository

class UnitOfWork(ABC):
    users:UserRepository
    organizations:OrganizationRepository
    memberships:MembershipRepository

    @abstractmethod
    async def __aenter__(self) -> "UnitOfWork":
        ...
    @abstractmethod
    async def __aexit__(self,exc_type,exc,tb) -> None:
        ...
    @abstractmethod
    async def commit(self) -> None:
        ...
    @abstractmethod
    async def rollback(self) -> None:
        ...
