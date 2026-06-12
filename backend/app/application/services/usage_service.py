from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.adapters.outbound.db.sqlalchemy_models import UsageLogORM


class UsageService:
    def __init__(self, *, session_factory: async_sessionmaker) -> None:
        self._session_factory = session_factory

    async def record(
        self,
        *,
        org_id: UUID,
        event_type: str,
        token_count: int = 0,
        document_count: int = 0,
        user_id: UUID | None = None,
        metadata: dict | None = None,
    ) -> None:
        async with self._session_factory() as session:
            session.add(
                UsageLogORM(
                    id=uuid4(),
                    org_id=org_id,
                    user_id=user_id,
                    event_type=event_type,
                    token_count=int(token_count),
                    document_count=int(document_count),
                    metadata_json=metadata or {},
                )
            )
            await session.commit()

    async def get_monthly_usage(self, *, org_id: UUID) -> dict:
        start = datetime.now(timezone.utc).replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
        async with self._session_factory() as session:
            row = (
                await session.execute(
                    select(
                        func.coalesce(func.sum(UsageLogORM.token_count), 0),
                        func.coalesce(func.sum(UsageLogORM.document_count), 0),
                        func.count(UsageLogORM.id),
                    ).where(
                        UsageLogORM.org_id == org_id,
                        UsageLogORM.created_at >= start,
                    )
                )
            ).one()
        return {
            "org_id": str(org_id),
            "period_start": start.isoformat(),
            "total_tokens": int(row[0]),
            "total_documents": int(row[1]),
            "total_events": int(row[2]),
        }
