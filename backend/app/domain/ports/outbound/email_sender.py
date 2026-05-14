from __future__ import annotations

from abc import ABC, abstractmethod


class EmailSender(ABC):
    """Outbound port for transactional email (invitations, etc.)."""

    @abstractmethod
    def send_invitation_email(
        self,
        *,
        to_email: str,
        invite_url: str,
        org_name: str,
        role: str,
        expires_in_hours: int,
    ) -> None:
        """Synchronous send (typically invoked from a Celery worker task)."""
        ...
