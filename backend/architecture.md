# MindVault AI — Backend Architecture

> Multi-tenant Retrieval-Augmented-Generation (RAG) SaaS backend.
> FastAPI + Celery, built with **Hexagonal (Ports & Adapters) / Clean
> Architecture** so the business rules stay independent of frameworks, the
> database, and external AI vendors.

---

## 1. Goals & Principles

| Principle | How it is realised |
|-----------|--------------------|
| **Separation of concerns** | Four concentric layers; dependencies only point *inward* (domain knows nothing about FastAPI, SQLAlchemy, Pinecone, OpenAI). |
| **Dependency Inversion** | The domain declares **ports** (abstract interfaces). Concrete **adapters** implement them and are wired at the edge by a DI container. |
| **Multi-tenancy** | Every row and every vector is scoped by `org_id`. Tenant context is carried in the JWT and enforced at the repository / vector-store boundary. |
| **Asynchronous by default** | Request path is `async` FastAPI; heavy ingestion is offloaded to Celery workers. |
| **Swappable infrastructure** | LLM (OpenAI/Gemini), reranker (FlashRank/Cohere/NoOp), vector store (Pinecone/pgvector), object storage (Local/S3), email (SMTP/Null) are all behind ports. |
| **Testability** | Pure domain logic + fakes for ports → fast unit tests; dependency overrides for integration tests. |

---

## 2. The Dependency Rule

```
            ┌──────────────────────────────────────────────────────┐
            │                    adapters (edge)                     │
            │   inbound: FastAPI routes      outbound: DB, Pinecone, │
            │                                 OpenAI, S3, Redis ...   │
            │   ┌──────────────────────────────────────────────┐    │
            │   │              application layer                 │    │
            │   │   use-cases / services orchestrate the domain  │    │
            │   │   ┌──────────────────────────────────────┐    │    │
            │   │   │              domain core              │    │    │
            │   │   │  entities · value objects · policies  │    │    │
            │   │   │  PORTS (interfaces) defined here       │    │    │
            │   │   └──────────────────────────────────────┘    │    │
            │   └──────────────────────────────────────────────┘    │
            └──────────────────────────────────────────────────────┘
        infrastructure (config, DI, security, observability) crosses layers

   Imports flow inward only:  adapters → application → domain
   The domain imports nothing from outer layers.
```

---

## 3. Source Layout

```
backend/app/
├── domain/                      # Pure business core — no framework imports
│   ├── entities/                # User, Organization, Document, DocumentChunk,
│   │                            #   ChatSession, ChatMessage, OrgMembership
│   ├── value_objects/           # Document(VO), TenantContext, IngestStatus,
│   │                            #   UserRole, MembershipStatus
│   ├── services/                # Stateless domain policies:
│   │                            #   chunking_policy, retrieval_policy,
│   │                            #   result_fusion, score_normalizer,
│   │                            #   citation_policy, context_builder
│   └── ports/
│       ├── inbound/             # Use-case contracts (commands)
│       └── outbound/            # Interfaces the domain needs:
│                                #   repositories, vector_store, llm_port,
│                                #   reranker, embedding_provider,
│                                #   full_text_search, object_storage,
│                                #   token_provider, unit_of_work, ...
│
├── application/                 # Orchestration (use-cases & services)
│   ├── services/                # ChatService, HybridSearchService,
│   │                            #   IAMService, UsageService
│   ├── use_cases/               # IngestDocument, ProcessDocumentChunks,
│   │                            #   SemanticSearch, Register/Login/SwitchOrg
│   ├── dto/                     # Pydantic request/response + document schemas
│   └── tasks/                   # Celery tasks: document, email, audit
│
├── adapters/
│   ├── inbound/api/v1/          # FastAPI routers (HTTP edge)
│   │                            #   routes_auth, routes_chat, routes_search,
│   │                            #   routes_documents, routes_usage
│   └── outbound/                # Driven adapters (implement outbound ports)
│       ├── db/                  # SQLAlchemy models, repositories, UoW,
│       │                        #   session, fts_adapter, Alembic migrations
│       ├── llm/                 # OpenAIAdapter, GeminiProvider
│       ├── ai/                  # Local BGE embedder (sentence-transformers)
│       ├── vector/             # PineconeVectorStore, PGVectorStore, retriever
│       ├── rerank/             # FlashRank, Cohere, NoOp rerankers
│       ├── storage/            # LocalObjectStorage, S3ObjectStorage
│       ├── loaders/ parser/    # PDF/DOCX/Text/Markdown extraction
│       ├── email/ key/         # SMTP sender, JWT key retriever
│
└── infrastructure/              # Cross-cutting wiring
    ├── config.py                # Env-driven Settings (single source of truth)
    ├── di/                      # providers.py (factories) + Container + retrieval_di
    ├── security/                # auth, permissions (RBAC), rate_limit,
    │                            #   tenant_context, redis_services
    │                            #   (TokenService / ThrottleService / InvitationService)
    ├── observability/           # MetricsService
    ├── prompts/                 # System prompt templates
    └── celery_app.py            # Celery application + queues
```

---

## 4. Layer Responsibilities

### 4.1 Domain (`app/domain`)
The only layer with business rules and **no external dependencies**.

- **Entities** — identity-bearing objects (`User`, `Organization`, `Document`,
  `ChatSession`, `ChatMessage`, …) with factory helpers
  (`ChatMessage.create_assistant_message`).
- **Value Objects** — immutable concepts: the retrieval `Document` (id, text,
  score, source, per-retriever sub-scores), `TenantContext`, `IngestStatus`.
- **Domain services (policies)** — pure functions/classes encoding algorithms:
  - `chunking_policy` — splitting + `estimate_token_count`.
  - `score_normalizer` — softmax / min-max / z-score.
  - `result_fusion` — weighted fusion **and** Reciprocal Rank Fusion (RRF).
  - `retrieval_policy` — strategy selection (vector / key / hybrid) + rerank.
  - `citation_policy` — extract & rank `Citation`s from chunks.
  - `context_builder` — **tiktoken** token-budgeted context assembly.
- **Ports** — abstract interfaces (`VectorStore`, `LLMPort`, `Reranker`,
  `EmbeddingProvider`, `FullTextSearch`, repositories, `UnitOfWork`,
  `TokenProvider`, `ObjectStorage`). The domain *depends on these, never on
  implementations*.

### 4.2 Application (`app/application`)
Orchestrates the domain to fulfil use-cases. Holds no business invariants of
its own; coordinates ports.

- `IngestDocumentService` — validate upload, store bytes, persist `pending`
  document, enqueue async processing.
- `ProcessDocumentChunksService` — (Celery worker) load → parse → chunk →
  embed → upsert vectors → mark `ready`/`failed`.
- `HybridSearchService` — run BM25 (FTS) + dense (vector) concurrently, fuse.
- `SemanticSearchService` — hybrid search → rerank → citations (search API).
- `ChatService` — retrieve → rerank → trim context → stream answer (SSE) →
  persist message → record usage.
- `IAMService` — auth, org membership, invitations, refresh rotation, **MFA**.
- `UsageService` — record & aggregate per-org token / document usage.

### 4.3 Adapters (`app/adapters`)
- **Inbound** — FastAPI routers translate HTTP ⇄ DTOs ⇄ application calls.
- **Outbound** — implement outbound ports against real technology
  (SQLAlchemy, Pinecone, OpenAI, FlashRank, Redis, filesystem/S3, SMTP).

### 4.4 Infrastructure (`app/infrastructure`)
Configuration, dependency injection, security primitives, observability — the
"glue" that assembles adapters into the application at runtime.

---

## 5. Ports → Adapters Catalog

| Outbound Port (domain) | Adapter(s) | Notes |
|------------------------|------------|-------|
| `VectorStore` | `PineconeVectorStore` (primary), `PGVectorStore` (alt) | `upsert`, `query_by_similarity`, `delete_by_document_id` (metadata filter) |
| `EmbeddingProvider` | `AsyncLocalBGEAdapter` / `SyncLocalBGEAdapter` | local `BAAI/bge-small-en-v1.5` (1536-dim space) |
| `FullTextSearch` | `FTSAdapter` | Postgres full-text (BM25-style keyword) |
| `Reranker` | `FlashRankReranker` → `CohereReranker` → `NoOpReranker` | cross-encoder; FlashRank is local/free default |
| `LLMPort` | `OpenAIAdapter` (`GeminiProvider` available) | streaming token generator |
| `ObjectStorage` | `LocalObjectStorage` / `S3ObjectStorage` | raw document bytes |
| `DocumentLoader` registry | PDF / DOCX / Text / Markdown loaders | source-type dispatch |
| repositories | `*RepositoryImpl` (+ Sync variants for Celery) | per-aggregate persistence |
| `UnitOfWork` | `SQLAlchemyUnitOfWork` | transactional message/session writes |
| `TokenProvider` / token svc | `JwtTokenProvider`, `TokenService` | JWT issue/verify, rotation, revocation |
| `EmailSender` | `SmtpEmailSender` / `NullEmailSender` | invitation mail |

Selection happens in **`infrastructure/di/providers.py`** based on `Settings`
(e.g. Cohere key present → Cohere; else FlashRank; else NoOp).

---

## 6. Domain & Persistence Model

Relational store: **PostgreSQL** (async via `asyncpg`), schema managed by
**Alembic**. ORM in `adapters/outbound/db/sqlalchemy_models.py`.

```
organizations ─┬─< organization_memberships >─┬─ users
               │                              │
               ├─< organization_invitations    ├─< refresh_tokens
               ├─< documents ─< document_chunks │
               ├─< chat_sessions ─< chat_messages
               ├─< usage_logs
               └─< audit_logs
```

| Table | Purpose |
|-------|---------|
| `users` | identity, `password_hash`, `mfa_enabled`, `mfa_secret` (TOTP) |
| `organizations` / `organization_memberships` | tenants + RBAC role/status |
| `organization_invitations` | signed, expiring invite tokens |
| `refresh_tokens` | refresh family tracking for rotation/replay defence |
| `documents` / `document_chunks` | ingested files + chunk text & citation spans |
| `chat_sessions` / `chat_messages` | conversation history + citations + token_count |
| `usage_logs` | per-event token / document metering for quotas |
| `audit_logs` | security events (login, MFA, invitations, …) |

**Vector data** lives in Pinecone (each vector tagged with `org_id` +
`document_id` metadata for tenant-scoped query and delete). `document_chunks`
keeps the canonical text + citation metadata in Postgres.

---

## 7. Request Lifecycle & Dependency Injection

```
HTTP → FastAPI router
     → Depends(get_current_claims)        # JWT verify, tenant + MFA gate
     → Depends(rate_limit(...))           # per-org Redis fixed window (chat/upload)
     → Depends(Container.get_*_service)   # factory from providers.py
     → application service                # orchestrates domain via ports
     → outbound adapters                  # DB / vector / LLM / storage
     → DTO response (or StreamingResponse)
```

- `infrastructure/di/providers.py` holds **factory functions** (some
  `@lru_cache`d singletons: embedder, vector store, reranker, object storage).
- `infrastructure/di/container.py` exposes them as `Container.get_*` for use in
  FastAPI `Depends(...)`, enabling clean **dependency overrides** in tests.

---

## 8. Key Flows

### 8.1 Authentication, JWT rotation & MFA
```
POST /auth/login
  └─ IAMService.login: verify password (bcrypt), throttle failures (Redis)
       ├─ mfa_enabled? → issue PARTIAL token {mfa:"pending"} ─┐
       └─ else        → issue access + refresh (persist family) │
                                                                 ▼
POST /auth/mfa/verify  {mfa_attempt_token, code}
  └─ IAMService.verify_mfa: decode pending token, pyotp TOTP check
       → issue full access + refresh, audit MFA_VERIFIED
```
- **Key rotation**: `TokenService` signs with the active `kid` and verifies
  against a *map* of `kid → secret` (`JWT_KEYS`), so signing keys rotate
  without invalidating live tokens.
- **Refresh rotation + replay defence**: refresh JTIs tracked in Redis;
  re-use of a consumed token revokes the whole family.
- **Gate**: `get_current_claims` rejects `type != access` and any
  `mfa == "pending"` token, blocking partial tokens from protected routes.
- **RBAC**: `requires_role("OWNER","ADMIN")` dependency for admin endpoints.
- **Tenant isolation**: `org_id` from claims is passed into every repository /
  vector-store call.

### 8.2 Document Ingestion (async)
```
POST /documents (multipart)               [rate-limited per org]
  └─ IngestDocumentService.execute
       ├─ validate size / source type
       ├─ ObjectStorage.put_object(bytes)
       ├─ DocumentRepository.save(status=pending)
       ├─ UsageService.record(document_count=1)
       └─ enqueue Celery task ───────────────────────► returns 202 (pending)

Celery worker: process_document_task
  └─ ProcessDocumentChunksService.execute   (structured logging w/ doc_id)
       load(file) → parse → chunk (chunking_policy)
                 → embed (BGE) → VectorStore.upsert(org_id,document_id)
                 → persist chunks → Document.status = ready | failed

GET /documents/{id}/status → poll until "ready"
```

### 8.3 Retrieval Pipeline (the RAG core)
```
query
  ├── dense:  EmbeddingProvider.embed → VectorStore.query_by_similarity(org_id)
  └── sparse: FullTextSearch.search(org_id)        (run concurrently)
        │
        ▼  result_fusion: RRF  (or weighted + score_normalizer)
   fused candidates (wide pool ≈ 20)
        ▼  Reranker.rerank  (FlashRank cross-encoder) → top 5
        ▼  context_builder.build_context (tiktoken budget) → trimmed context
        ▼  citation_policy → ranked Citations (from the chunks actually used)
```

### 8.4 Chat (streaming + persistence + citations + usage)
```
POST /chats/{session_id}/ask              [rate-limited per org]
  └─ ChatService.ask_question  →  StreamingResponse (text/event-stream)
       1. retrieval pipeline (8.3) → context + citations
       2. persist USER message (UnitOfWork)
       3. LLMPort.generate_response_stream → yield SSE token events
       4. yield terminal {type:"citations"} event, then [DONE]
       5. persist ASSISTANT message (content + citations + token_count)
       6. UsageService.record(token_count)        # post-stream, non-blocking
```
SSE event shapes: `data: {"type":"token","content":"…"}` …
`data: {"type":"citations","citations":[…]}` … `data: [DONE]`.

### 8.5 Document Deletion Chain (atomic-ish, 3 stores)
```
DELETE /documents/{id}
  1. VectorStore.delete_by_document_id(org_id, document_id)   # forget first
  2. DocumentRepository.delete  → cascades document_chunks (FK ON DELETE CASCADE)
  3. ObjectStorage.delete_object(storage_url)                 # best-effort
```
Vectors are purged first so a stale document can never resurface in answers;
external-store failures are logged but do not block removal of the app record.

---

## 9. Cross-Cutting Concerns

| Concern | Mechanism |
|---------|-----------|
| **Configuration** | `infrastructure/config.py` — single env-driven `Settings`, validated at boot (`JWT_ACTIVE_KID ∈ JWT_KEYS`, prod secret strength). |
| **Security** | bcrypt hashing, JWT (rotation + revocation), refresh replay defence, login throttling, RBAC, per-tenant isolation, TOTP MFA. |
| **Rate limiting** | `security/rate_limit.py` — Redis fixed-window dependency on `/chat` & `/upload`, keyed by org; fails open on Redis error. |
| **Usage / quota** | `UsageService` writes `usage_logs`; `GET /usage` returns current-month token/document totals. |
| **Observability** | `GET /health` (liveness) + `GET /health/ready` (Postgres/Redis/Pinecone); structured Celery logging with `doc_id`; `MetricsService` for doc/chunk counts. |
| **Auditing** | `audit_logs` records login success/failure, MFA, invitations. |

---

## 10. Asynchronous Processing (Celery)

```
FastAPI (web)  ──enqueue──►  Redis (broker)  ──►  Celery worker(s)
                                                    └─ process_document_task
                                                    └─ email / audit tasks
Result backend: Redis.   Queues: default + email (configurable).
```
Workers use **sync** repository/vector adapters (`Sync*Impl`,
`SyncLocalBGEAdapter`) to avoid mixing event loops inside the worker process.
Tasks `autoretry_for=(OSError, ConnectionError)` with backoff; `acks_late=True`.

---

## 11. Technology Stack

| Area | Choice |
|------|--------|
| Web framework | FastAPI (ASGI, `async`) |
| Background jobs | Celery + Redis broker/backend |
| Relational DB | PostgreSQL via SQLAlchemy 2.x async + asyncpg; Alembic migrations |
| Cache / ephemeral state | Redis (tokens, throttle, rate limit) |
| Vector DB | Pinecone (primary); pgvector adapter available |
| Embeddings | sentence-transformers `BAAI/bge-small-en-v1.5` (local) |
| Reranking | FlashRank (local) / Cohere / NoOp |
| LLM | OpenAI (`gpt-4o-mini` default); Gemini adapter available |
| Tokenisation | tiktoken (context budgeting) |
| Auth | PyJWT (HS256, multi-kid), passlib/bcrypt, pyotp (TOTP) |
| Doc parsing | pypdf / PyMuPDF, python-docx |

---

## 12. Testing Strategy

- **Unit** (`tests/unit`) — pure domain policies and application services with
  in-memory fakes (`tests/helpers/mocks.py`); no I/O. Markers: `unit`.
- **Integration** (`tests/integration`) — FastAPI `TestClient` with
  `dependency_overrides` / monkeypatched providers (auth, chat, documents,
  usage, health). Markers: `integration`.
- **Contract** (`tests/contract`) — adapter conformance to ports
  (e.g. object storage). Markers: `contract`.
- Tooling: `pytest` (`asyncio_mode=auto`), `black`, `isort`, `flake8`
  (max line 88), `mypy`.

---

## 13. Runtime Topology

```
            ┌────────────┐     ┌──────────────┐
   client → │  FastAPI   │ ◄── │   Postgres   │  (documents, chats, IAM, usage)
            │  (uvicorn) │ ──► │              │
            └─────┬──────┘     └──────────────┘
                  │  ▲            ┌──────────────┐
        enqueue   │  │ tokens/    │    Redis     │  (broker, cache, rate limit)
                  ▼  │ rate limit └──────┬───────┘
            ┌────────────┐               │
            │  Celery    │ ◄─────────────┘
            │  worker(s) │ ──► Pinecone (vectors)   ──► OpenAI (LLM)
            └────────────┘ ──► Object storage (S3/local)
```

---

## 14. Extension Points

- **New file type** → add a `DocumentLoader` + register in the loader registry.
- **New LLM / reranker / vector store** → implement the port, switch in
  `providers.py`; no domain/application change.
- **New retrieval strategy** → extend `result_fusion` / `retrieval_policy`.
- **New quota dimension** → add a column to `usage_logs` + `UsageService`.

The dependency rule guarantees these changes stay at the edge: the domain core
and use-cases remain untouched.
