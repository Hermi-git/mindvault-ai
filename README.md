# MindVault AI

MindVault AI is a multi-tenant SaaS platform for turning internal documents into a searchable, AI-powered knowledge base. It uses Retrieval-Augmented Generation (RAG) so responses are grounded in the company data you upload.

## Overview

The application is designed as a decoupled frontend and backend system focused on scalable ingestion, retrieval, and streaming responses.

## Architecture

### High-Level Flow

1. Documents are uploaded to object storage.
2. The FastAPI backend triggers a background Celery job to process them.
3. Files are chunked and converted into embeddings.
4. Embeddings are stored in Pinecone with tenant metadata.
5. User queries are embedded and matched against the vector store.
6. Relevant context is streamed to the LLM for the final response.

### Storage and Retrieval

- Structured application data lives in PostgreSQL.
- Vector embeddings live in Pinecone.
- Queries are filtered by `org_id` to keep tenant data isolated.
- Responses are streamed to the client for a ChatGPT-like experience.

## Tech Stack

- Frontend: Next.js 14+, TypeScript, Tailwind CSS, shadcn/ui, Vercel AI SDK
- Backend: FastAPI, Celery, Redis
- Database: PostgreSQL, Pinecone
- AI: OpenAI API for chat and embeddings
- Infrastructure: Docker, AWS S3 or compatible object storage

## Key Features

- Multi-tenant isolation with metadata-based filtering
- Streaming RAG responses for low-latency UX
- Background document ingestion with Celery and Redis
- Smart chunking to preserve semantic context
- Source citations in AI responses
- JWT-based authentication

## Why This Architecture

### FastAPI for orchestration

Python has a stronger ecosystem for document processing and AI workflows, while FastAPI handles async request patterns and streaming responses well.

### Chunking strategy

Recursive character splitting with overlap balances retrieval quality and context retention. Smaller chunks improve precision; larger chunks improve continuity but can add noise.

### Shared vector index

Using a single vector index with metadata filtering is more scalable than creating one index per tenant, while still enforcing isolation through `org_id` filtering.

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- Docker for local Redis and PostgreSQL
- OpenAI API key

### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

## Environment Variables

### Backend

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `PINECONE_API_KEY`
- `PINECONE_ENVIRONMENT`
- `REDIS_URL`

### Frontend

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

## Security

MindVault AI is designed with standard SaaS security practices in mind:

- Data encryption at rest
- Secure JWT handling with HTTP-only cookies
- Strict CORS policies
- Tenant-aware vector filtering

## Project Structure

- `backend/` - API, workers, and backend configuration
- `frontend/` - Client application
- `docs/` - Architecture and supporting documentation

## Documentation

- [Architecture](docs/architecture.md)
