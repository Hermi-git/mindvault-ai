"""Object storage adapters (local FS, S3/Supabase in the future)."""

from app.adapters.outbound.storage.local_storage import LocalObjectStorage

__all__ = ["LocalObjectStorage"]
