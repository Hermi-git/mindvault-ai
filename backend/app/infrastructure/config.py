from __future__ import annotations

import os


class Settings:
    environment: str = os.getenv("ENVIRONMENT", "development")
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/mindvault",
    )
    jwt_secret: str = os.getenv("JWT_SECRET", "dev-secret")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    jwt_issuer: str = os.getenv("JWT_ISSUER", "mindvault-ai")
    jwt_audience: str = os.getenv("JWT_AUDIENCE", "mindvault-clients")
    access_token_ttl_seconds: int = int(os.getenv("ACCESS_TOKEN_TTL_SECONDS", "3600"))
    refresh_token_ttl_seconds: int = int(os.getenv("REFRESH_TOKEN_TTL_SECONDS", "604800"))
    mfa_attempt_ttl_seconds: int = int(os.getenv("MFA_ATTEMPT_TTL_SECONDS", "300"))
    invitation_ttl_seconds: int = int(os.getenv("INVITATION_TTL_SECONDS", "172800"))
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    jwt_active_kid: str = os.getenv("JWT_ACTIVE_KID", "k1")
    jwt_keys_raw: str = os.getenv("JWT_KEYS", "k1:dev-secret")
    login_soft_lock_threshold: int = int(os.getenv("LOGIN_SOFT_LOCK_THRESHOLD", "5"))
    login_hard_lock_threshold: int = int(os.getenv("LOGIN_HARD_LOCK_THRESHOLD", "10"))
    login_soft_lock_seconds: int = int(os.getenv("LOGIN_SOFT_LOCK_SECONDS", "900"))
    login_hard_lock_seconds: int = int(os.getenv("LOGIN_HARD_LOCK_SECONDS", "86400"))

    def validate(self) -> None:
        # Production hardening guardrails.
        if self.environment.lower() in {"prod", "production"}:
            if self.jwt_secret == "dev-secret" or len(self.jwt_secret) < 32:
                raise RuntimeError(
                    "JWT_SECRET must be set with at least 32 characters in production."
                )
        if self.jwt_active_kid not in self.jwt_keys:
            raise RuntimeError("JWT_ACTIVE_KID must exist in JWT_KEYS.")

    @property
    def jwt_keys(self) -> dict[str, str]:
        pairs: dict[str, str] = {}
        for item in self.jwt_keys_raw.split(","):
            if ":" not in item:
                continue
            kid, key = item.split(":", 1)
            pairs[kid.strip()] = key.strip()
        if not pairs:
            pairs["k1"] = self.jwt_secret
        return pairs


settings = Settings()
settings.validate()
