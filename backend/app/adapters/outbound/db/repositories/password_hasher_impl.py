from __future__ import annotations

import bcrypt

from app.domain.ports.outbound.password_hasher import PasswordHasher


class BcryptPasswordHasher(PasswordHasher):
    """
    Uses bcrypt directly instead of passlib wrapper to avoid version compatibility issues.
    bcrypt automatically handles password encoding and validation.
    """

    def hash_password(self, *, plain_password: str) -> str:
        try:
            # bcrypt.hashpw automatically validates password length (max 72 bytes)
            # Use salt rounds = 12 for good security/speed tradeoff
            salt = bcrypt.gensalt(rounds=12)
            hashed = bcrypt.hashpw(plain_password.encode('utf-8'), salt)
            return hashed.decode('utf-8')
        except ValueError as e:
            raise

    def verify_password(self, *, plain_password: str, hashed_password: str) -> bool:
        try:
            return bcrypt.checkpw(
                plain_password.encode('utf-8'),
                hashed_password.encode('utf-8')
            )
        except Exception:
            return False
