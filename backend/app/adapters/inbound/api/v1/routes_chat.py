from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.application.dto.requests import ChatRequest
from app.infrastructure.config import settings
from app.infrastructure.di.container import Container
from app.infrastructure.security.auth import get_current_claims
from app.infrastructure.security.rate_limit import rate_limit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chats", tags=["chats"])


@router.post(
    "/{session_id}/ask",
    dependencies=[
        Depends(
            rate_limit(
                scope="chat",
                limit=settings.chat_rate_limit_per_min,
                window=settings.rate_limit_window_seconds,
            )
        )
    ],
)
async def chat(
    session_id: UUID,
    payload: ChatRequest,
    claims: dict = Depends(get_current_claims),
    chat_service=Depends(Container.get_chat_service),
) -> StreamingResponse:
    user_id = UUID(claims["sub"])
    org_id = UUID(claims["org_id"])

    async def event_generator():
        try:
            async for chunk in chat_service.ask_question(
                session_id=session_id,
                org_id=org_id,
                user_id=user_id,
                user_query=payload.message,
            ):
                yield chunk
        except Exception:
            logger.exception("Chat streaming failed")
            raise

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
