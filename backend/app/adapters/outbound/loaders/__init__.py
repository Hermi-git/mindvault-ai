"""Document loaders that turn uploaded bytes into plain text for chunking."""

from app.adapters.outbound.loaders.docx_loader import DocxDocumentLoader
from app.adapters.outbound.loaders.pdf_loader import PDFDocumentLoader
from app.adapters.outbound.loaders.text_loader import TextDocumentLoader

__all__ = ["DocxDocumentLoader", "PDFDocumentLoader", "TextDocumentLoader"]
