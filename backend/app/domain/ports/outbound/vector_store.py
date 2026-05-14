from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class VectorStore(ABC):
    """Interface for a vector store that can save and query text embeddings."""

    @abstractmethod
    async def upsert(
        self, *, vectors: List[Dict[str, Any]], namespace: Optional[str] = None
    ) -> None:
        """Upsert a batch of vectors into the store.

        Args:
            vectors: A list of dicts, each containing at least 'id' (str) and 'embedding' (list[float]).
            namespace: An optional namespace for the vectors.
        """
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
