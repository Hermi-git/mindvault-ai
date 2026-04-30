from __future__ import annotations

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.infrastructure.di.providers import get_token_service

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_claims(
    request: Request = None,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    token = None
    
    # Try to get token from Authorization header first (Bearer scheme)
    if credentials:
        token = credentials.credentials
    # Fallback to reading from HttpOnly cookie
    elif request:
        token = request.cookies.get("accessToken")
    
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid token")
    
    token_service = get_token_service()
    try:
        claims = token_service.decode(token)
        if claims.get("type") != "access":
            raise ValueError("Invalid token type")
        if not claims.get("sub") or not claims.get("org_id"):
            raise ValueError("Token missing required claims")
        if await token_service.is_access_revoked(jti=claims["jti"]):
            raise ValueError("Access token revoked")
        if await token_service.is_user_globally_revoked(
            user_id=claims["sub"], iat=int(claims["iat"])
        ):
            raise ValueError("Session revoked")
        return claims
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
