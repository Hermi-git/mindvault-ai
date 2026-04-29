from __future__ import annotations

from dataclasses import dataclass

from app.infrastructure.di import providers


@dataclass(slots=True)
class Container:
    get_register_user_service = staticmethod(providers.get_register_user_service)
    get_login_user_service = staticmethod(providers.get_login_user_service)
    get_switch_org_service = staticmethod(providers.get_switch_org_service)
    get_iam_service = staticmethod(providers.get_iam_service)
