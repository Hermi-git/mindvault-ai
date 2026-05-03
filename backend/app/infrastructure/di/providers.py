from __future__ import annotations

from redis.asyncio import Redis

from app.adapters.outbound.db.repositories.password_hasher_impl import BcryptPasswordHasher
from app.adapters.outbound.db.repositories.token_provider_impl import JwtTokenProvider
from app.adapters.outbound.db.repositories.uow_impl import SQLAlchemyUnitOfWork
from app.adapters.outbound.db.session import SessionFactory
from app.adapters.outbound.email.email_sender import NullEmailSender, SmtpEmailSender
from app.application.services.iam_service import IAMService
from app.application.use_cases.login_user_service import LoginUserService
from app.application.use_cases.register_user_service import RegisterUserService
from app.application.use_cases.switch_org_service import SwitchOrganizationService
from app.infrastructure.config import settings
from app.domain.ports.outbound.email_sender import EmailSender
from app.infrastructure.security.redis_services import InvitationService, ThrottleService, TokenService


def get_uow_factory():
    return lambda: SQLAlchemyUnitOfWork(SessionFactory)


def get_password_hasher():
    return BcryptPasswordHasher()


def get_token_provider():
    return JwtTokenProvider(
        secret=settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
        issuer=settings.jwt_issuer,
        audience=settings.jwt_audience,
    )


def get_redis_client() -> Redis:
    return Redis.from_url(settings.redis_url, decode_responses=True)


def get_token_service() -> TokenService:
    return TokenService(
        get_redis_client(),
        keys=settings.jwt_keys,
        active_kid=settings.jwt_active_kid,
        issuer=settings.jwt_issuer,
        audience=settings.jwt_audience,
    )


def get_throttle_service() -> ThrottleService:
    return ThrottleService(
        get_redis_client(),
        soft_limit=settings.login_soft_lock_threshold,
        hard_limit=settings.login_hard_lock_threshold,
        soft_ttl=settings.login_soft_lock_seconds,
        hard_ttl=settings.login_hard_lock_seconds,
    )


def get_invitation_service() -> InvitationService:
    signing_secret = settings.invitation_signing_secret or settings.jwt_secret
    return InvitationService(secret=signing_secret, issuer=settings.jwt_issuer)


def get_email_sender() -> EmailSender:
    if not settings.use_smtp_email_delivery:
        return NullEmailSender()
    return SmtpEmailSender(
        host=settings.smtp_host,
        port=settings.smtp_port,
        username=(settings.smtp_username or "").strip() or None,
        password=settings.smtp_password_for_auth,
        use_tls=settings.smtp_use_tls,
        from_email=settings.smtp_from_email,
        from_name=settings.smtp_from_name or "MindVault AI",
    )


def get_iam_service() -> IAMService:
    return IAMService(
        session_factory=SessionFactory,
        token_service=get_token_service(),
        throttle_service=get_throttle_service(),
        invitation_service=get_invitation_service(),
        password_hasher=get_password_hasher(),
        frontend_base_url=settings.frontend_base_url,
        access_ttl_seconds=settings.access_token_ttl_seconds,
        refresh_ttl_seconds=settings.refresh_token_ttl_seconds,
        mfa_attempt_ttl_seconds=settings.mfa_attempt_ttl_seconds,
    )


def get_register_user_service():
    return RegisterUserService(
        uow_factory=get_uow_factory(),
        password_hasher=get_password_hasher(),
    )


def get_login_user_service():
    return LoginUserService(
        uow_factory=get_uow_factory(),
        password_hasher=get_password_hasher(),
        token_provider=get_token_provider(),
        access_token_ttl_seconds=settings.access_token_ttl_seconds,
        refresh_token_ttl_seconds=settings.refresh_token_ttl_seconds,
    )


def get_switch_org_service():
    return SwitchOrganizationService(
        uow_factory=get_uow_factory(),
        token_provider=get_token_provider(),
        access_token_ttl_seconds=settings.access_token_ttl_seconds,
        refresh_token_ttl_seconds=settings.refresh_token_ttl_seconds,
    )
