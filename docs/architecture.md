# System Architecture

```mermaid
graph TD
    User((User)) --> NextJS[Next.js Frontend]
    NextJS --> FastAPI[FastAPI Backend]
    
    subgraph "Ingestion Pipeline"
        FastAPI --> S3[S3 Storage]
        FastAPI --> Celery[Celery Worker]
        Celery --> OpenAI_Embed[OpenAI Embeddings]
        OpenAI_Embed --> VectorDB[(Pinecone Vector DB)]
    end
    
    subgraph "Retrieval Pipeline (RAG)"
        FastAPI --> VectorDB
        VectorDB --> Context[Context Retrieval]
        Context --> OpenAI_LLM[GPT-4o]
        OpenAI_LLM --> FastAPI
    end
    
    FastAPI --> Postgres[(PostgreSQL Metadata)]