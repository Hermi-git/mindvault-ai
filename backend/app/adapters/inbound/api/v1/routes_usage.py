from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.application.dto.responses import UsageResponse
from app.infrastructure.di.container import Container
from app.infrastructure.security.auth import get_current_claims

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/usage", tags=["usage"])


@router.get("", response_model=UsageResponse, summary="Current-month usage for org")
async def get_usage(
    claims: dict = Depends(get_current_claims),
    usage_service=Depends(Container.get_usage_service),
) -> UsageResponse:
    org_id_str = claims.get("org_id")
    if not org_id_str:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="No active organization"
        )
    result = await usage_service.get_monthly_usage(org_id=UUID(org_id_str))
    return UsageResponse(**result)
