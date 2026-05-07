"""Backwards-compatible re-export.

Markdown loading is currently the same as plain text decoding; we keep a
separate import path so adding a real markdown stripper later doesn't break
callers.
"""

from __future__ import annotations

from app.adapters.outbound.loaders.text_loader import TextDocumentLoader

MarkdownDocumentLoader = TextDocumentLoader

__all__ = ["MarkdownDocumentLoader"]
