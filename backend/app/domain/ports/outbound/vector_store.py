from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class VectorStore(ABC):
    @abstractmethod
    async def upsert(
        self, *, vectors: List[Dict[str, Any]], namespace: Optional[str] = None
    ) -> None:
        ...

    @abstractmethod
    async def query_by_similarity(
        self,
        *,
        query_vector: List[float],
        org_id: str,
        top_k: int = 5,
        namespace: Optional[str] = None
    ) -> List[Dict[str, Any]]: ...

    @abstractmethod
    async def delete_by_doc_id(self, *, doc_id: str, org_id: str) -> None: ...
