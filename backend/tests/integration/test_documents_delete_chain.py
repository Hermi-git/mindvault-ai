"""Integration test: deleting a document purges vectors, DB row, and bytes."""

from __future__ import annotations

import pytest

from tests.helpers.mocks import FakeDocumentRepo, FakeMemoryStorage, make_document

ROUTES = "app.adapters.inbound.api.v1.routes_documents"


class RecordingVectorStore:
    def __init__(self) -> None:
        self.deleted: list[dict] = []

    async def delete_by_document_id(self, *, document_id: str, org_id: str) -> None:
        self.deleted.append({"document_id": document_id, "org_id": org_id})


@pytest.mark.integration
def test_delete_document_purges_all_stores(
    authed_client, test_org_id, monkeypatch
) -> None:
    doc = make_document(org_id=test_org_id)
    repo = FakeDocumentRepo(documents={doc.id: doc})
    vector_store = RecordingVectorStore()
    storage = FakeMemoryStorage()
    storage.put_object(key=doc.storage_url, data=b"bytes")

    monkeypatch.setattr(f"{ROUTES}.get_document_repository", lambda: repo)
    monkeypatch.setattr(f"{ROUTES}.get_vector_store", lambda: vector_store)
    monkeypatch.setattr(f"{ROUTES}.get_object_storage", lambda: storage)

    response = authed_client.delete(
        f"/api/v1/documents/{doc.id}",
        headers={"Authorization": "Bearer x"},
    )

    assert response.status_code == 204
    # Vectors purged for the right document + tenant.
    assert vector_store.deleted == [
        {"document_id": str(doc.id), "org_id": str(test_org_id)}
    ]
    # DB row removed (cascades chunks) and stored bytes gone.
    assert doc.id not in repo.documents
    assert doc.storage_url not in storage._objects


@pytest.mark.integration
def test_delete_missing_document_returns_404(authed_client, monkeypatch) -> None:
    from uuid import uuid4

    monkeypatch.setattr(f"{ROUTES}.get_document_repository", lambda: FakeDocumentRepo())
    response = authed_client.delete(
        f"/api/v1/documents/{uuid4()}",
        headers={"Authorization": "Bearer x"},
    )
    assert response.status_code == 404
