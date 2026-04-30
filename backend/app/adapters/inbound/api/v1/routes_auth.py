from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, Response, status

from app.application.dto.requests import (
    AcceptInvitationRequest,
    InviteMemberRequest,
    LoginRequest,
    PatchMemberRequest,
    RefreshTokenRequest,
    RegisterRequest,
    SwitchOrgRequest,
)
from app.application.dto.responses import (
    InviteMemberResponse,
    MFAPartialResponse,
    MeResponse,
    MembersListResponse,
    RegisterResponse,
    SwitchOrgResponse,
    TokenPairResponse,
)
from app.domain.ports.inbound.auth.org_switch_inbound_contracts import SwitchOrganizationCommand
from app.domain.ports.inbound.auth.registration_inbound_contracts import RegisterUserCommand
from app.infrastructure.config import settings
from app.infrastructure.di.container import Container
from app.infrastructure.security.auth import get_current_claims
from app.infrastructure.security.permissions import requires_role

router = APIRouter(prefix="/auth", tags=["auth"])

# Determine if cookies should be secure (HTTPS only) based on environment
IS_PRODUCTION = settings.environment.lower() in {"prod", "production"}
COOKIE_SECURE = IS_PRODUCTION  # Only require HTTPS in production


@router.post("/register", response_model=RegisterResponse)
async def register(
    payload: RegisterRequest,
    response: Response,
    iam_service=Depends(Container.get_iam_service),
    service=Depends(Container.get_register_user_service),
) -> RegisterResponse:
    try:
        result = await service.execute(
            RegisterUserCommand(
                email=str(payload.email),
                password=payload.password,
                full_name=payload.full_name,
                organization_name=payload.organization_name,
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    
    # Auto-login after successful registration
    try:
        login_result = await iam_service.login(
            email=str(payload.email),
            password=payload.password,
            org_slug=None,
            ip_address=None,
            user_agent=None,
        )
    except ValueError as exc:
        # Registration succeeded but auto-login failed - return user info without cookies
        return RegisterResponse(
            user_id=str(result.user_id),
            default_org_id=str(result.default_org_id) if result.default_org_id else None
        )
    
    # Set HttpOnly cookies for successful auto-login
    if not login_result.get("mfa_required"):
        access_token = login_result["access_token"]
        refresh_token = login_result["refresh_token"]
        access_ttl = 3600  # 1 hour
        refresh_ttl = 604800  # 7 days
        
        response.set_cookie(
            key="accessToken",
            value=access_token,
            max_age=access_ttl,
            httponly=True,
            secure=COOKIE_SECURE,
            samesite="strict",
        )
        response.set_cookie(
            key="refreshToken",
            value=refresh_token,
            max_age=refresh_ttl,
            httponly=True,
            secure=COOKIE_SECURE,
            samesite="strict",
        )
    
    return RegisterResponse(
        user_id=str(result.user_id),
        default_org_id=str(result.default_org_id) if result.default_org_id else None
    )


@router.post("/login", response_model=TokenPairResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    iam_service=Depends(Container.get_iam_service),
) -> TokenPairResponse | MFAPartialResponse:
    try:
        result = await iam_service.login(
            email=str(payload.email),
            password=payload.password,
            org_slug=payload.org_slug,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    
    # If MFA is required, return early (no cookies yet)
    if result.get("mfa_required"):
        return MFAPartialResponse(
            mfa_attempt_token=result["mfa_attempt_token"],
            expires_in_seconds=result["expires_in_seconds"],
        )
    
    # Set HttpOnly cookies for successful login
    access_token = result["access_token"]
    refresh_token = result["refresh_token"]
    access_ttl = 3600  # 1 hour (from .env ACCESS_TOKEN_TTL_SECONDS)
    refresh_ttl = 604800  # 7 days (from .env REFRESH_TOKEN_TTL_SECONDS)
    
    response.set_cookie(
        key="accessToken",
        value=access_token,
        max_age=access_ttl,
        httponly=True,      # JavaScript cannot access
        secure=COOKIE_SECURE,        # HTTPS only in production
        samesite="strict",  # CSRF protection
    )
    response.set_cookie(
        key="refreshToken",
        value=refresh_token,
        max_age=refresh_ttl,
        httponly=True,      # JavaScript cannot access
        secure=COOKIE_SECURE,        # HTTPS only in production
        samesite="strict",  # CSRF protection
    )
    
    # Return response with cookies set
    return TokenPairResponse(
        access_token="",  # Empty - token is in cookie
        refresh_token="",  # Empty - token is in cookie
        token_type=result.get("token_type", "bearer"),
    )


@router.post("/switch-org", response_model=SwitchOrgResponse)
async def switch_org(
    payload: SwitchOrgRequest,
    response: Response,
    claims: dict = Depends(get_current_claims),
    service=Depends(Container.get_switch_org_service),
) -> SwitchOrgResponse:
    try:
        target_org_id = UUID(payload.target_org_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid target_org_id UUID") from exc

    try:
        result = await service.execute(
            SwitchOrganizationCommand(
                user_id=UUID(str(claims["sub"])),
                target_org_id=target_org_id,
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    
    # Set HttpOnly cookies with new org tokens
    access_token = result.access_token
    refresh_token = result.refresh_token
    access_ttl = 3600  # 1 hour
    refresh_ttl = 604800  # 7 days
    
    response.set_cookie(
        key="accessToken",
        value=access_token,
        max_age=access_ttl,
        httponly=True,
        secure=True,
        samesite="strict",
    )
    response.set_cookie(
        key="refreshToken",
        value=refresh_token,
        max_age=refresh_ttl,
        httponly=True,
        secure=True,
        samesite="strict",
    )
    
    return SwitchOrgResponse(
        access_token="",  # Empty - token is in cookie
        refresh_token="",  # Empty - token is in cookie
        active_org_id=str(result.active_org_id),
    )


@router.get("/me", response_model=MeResponse)
async def me(claims: dict = Depends(get_current_claims)) -> MeResponse:
    return MeResponse(
        user_id=str(claims.get("sub")),
        org_id=str(claims.get("org_id")),
        role=str(claims.get("role", "member")),
    )


@router.post("/refresh", response_model=TokenPairResponse)
async def refresh_tokens(
    payload: RefreshTokenRequest | None = None,
    response: Response = None,
    request: Request = None,
    iam_service=Depends(Container.get_iam_service),
) -> TokenPairResponse:
    # Support both body-based and cookie-based refresh tokens
    refresh_token = None
    
    if payload and payload.refresh_token:
        refresh_token = payload.refresh_token
    else:
        # Try to get from HttpOnly cookie
        refresh_token = request.cookies.get("refreshToken")
    
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token provided") from None
    
    try:
        result = await iam_service.refresh(refresh_token=refresh_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    
    # Set HttpOnly cookies with new tokens
    access_token = result["access_token"]
    new_refresh_token = result["refresh_token"]
    access_ttl = 3600  # 1 hour
    refresh_ttl = 604800  # 7 days
    
    response.set_cookie(
        key="accessToken",
        value=access_token,
        max_age=access_ttl,
        httponly=True,
        secure=True,
        samesite="strict",
    )
    response.set_cookie(
        key="refreshToken",
        value=new_refresh_token,
        max_age=refresh_ttl,
        httponly=True,
        secure=True,
        samesite="strict",
    )
    
    return TokenPairResponse(
        access_token="",  # Empty - token is in cookie
        refresh_token="",  # Empty - token is in cookie
        token_type=result["token_type"],
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    claims: dict = Depends(get_current_claims),
    iam_service=Depends(Container.get_iam_service),
) -> None:
    await iam_service.logout(access_claims=claims)


@router.post("/orgs/{org_id}/invite", response_model=InviteMemberResponse)
async def invite_member(
    org_id: UUID,
    payload: InviteMemberRequest,
    background_tasks: BackgroundTasks,
    claims: dict = Depends(requires_role("OWNER", "ADMIN")),
    iam_service=Depends(Container.get_iam_service),
) -> InviteMemberResponse:
    try:
        token = await iam_service.create_invitation(
            actor_claims=claims,
            org_id=org_id,
            email=str(payload.email),
            role=payload.role,
            ttl_seconds=172800,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    background_tasks.add_task(
        iam_service._audit,
        event_type="USER_INVITED",
        actor_id=UUID(str(claims["sub"])),
        org_id=org_id,
        ip_address=None,
        user_agent=None,
        metadata={"email": str(payload.email), "role": payload.role},
    )
    return InviteMemberResponse(
        invitation_token=token,
        invite_url=f"https://app.mindvault.ai/invitations/accept?token={token}",
    )


@router.post("/invitations/accept", status_code=status.HTTP_204_NO_CONTENT)
async def accept_invitation(
    payload: AcceptInvitationRequest,
    claims: dict = Depends(get_current_claims),
    iam_service=Depends(Container.get_iam_service),
) -> None:
    await iam_service.accept_invitation(token=payload.invitation_token, user_id=UUID(str(claims["sub"])))


@router.get("/orgs/{org_id}/members", response_model=MembersListResponse)
async def list_members(
    org_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    claims: dict = Depends(requires_role("OWNER", "ADMIN")),
    iam_service=Depends(Container.get_iam_service),
) -> MembersListResponse:
    try:
        result = await iam_service.list_org_members(
            actor_claims=claims, org_id=org_id, page=page, page_size=page_size
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    return MembersListResponse(**result)


@router.patch("/orgs/{org_id}/members/{user_id}")
async def patch_member(
    org_id: UUID,
    user_id: UUID,
    payload: PatchMemberRequest,
    claims: dict = Depends(requires_role("OWNER", "ADMIN")),
    iam_service=Depends(Container.get_iam_service),
) -> dict:
    try:
        return await iam_service.patch_member(
            actor_claims=claims,
            org_id=org_id,
            user_id=user_id,
            role=payload.role,
            status=payload.status,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.delete("/orgs/{org_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_member(
    org_id: UUID,
    user_id: UUID,
    claims: dict = Depends(requires_role("OWNER", "ADMIN")),
    iam_service=Depends(Container.get_iam_service),
) -> None:
    try:
        await iam_service.delete_member(actor_claims=claims, org_id=org_id, user_id=user_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
