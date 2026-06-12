'use client';

import { X, Loader2, FileText } from 'lucide-react';
import { useDocumentChunks } from '@/hooks/useDocuments';
import type { DocumentResponse } from '@/services/api';

interface Props {
  document: DocumentResponse | null;
  onClose: () => void;
}

export function DocumentChunksDrawer({ document, onClose }: Props) {
  const { data, isLoading, error } = useDocumentChunks(document?.id ?? null);

  if (!document) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative flex h-full w-full max-w-xl flex-col border-l border-slate-800 bg-slate-900 shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-slate-400" />
              <h2 className="truncate text-lg font-semibold text-white">
                {document.title}
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              {document.chunk_count} chunks · {document.token_count.toLocaleString()} tokens
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 transition-colors hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading chunks...
            </div>
          ) : error ? (
            <p className="text-sm text-red-400">Failed to load chunks.</p>
          ) : !data || data.items.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-400">
              No chunks available yet. They appear once ingestion completes.
            </p>
          ) : (
            <ul className="space-y-3">
              {data.items.map((chunk) => (
                <li
                  key={chunk.id}
                  className="rounded-lg border border-slate-800 bg-slate-950/40 p-4"
                >
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                    <span className="font-mono">#{chunk.chunk_index}</span>
                    <span>~{chunk.token_count_estimate} tokens</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                    {chunk.content}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
