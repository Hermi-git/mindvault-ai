'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { FileText, Trash2, Eye, Loader2, ArrowLeft, Info } from 'lucide-react';
import { useDocuments, useDeleteDocument } from '@/hooks/useDocuments';
import { formatDateTime } from '@/lib/utils/helpers';
import type { DocumentResponse, DocumentStatus } from '@/services/api';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import { UploadDropzone } from './UploadDropzone';
import { DocumentChunksDrawer } from './DocumentChunksDrawer';

const FILTERS: { label: string; value: DocumentStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Ready', value: 'ready' },
  { label: 'Processing', value: 'processing' },
  { label: 'Pending', value: 'pending' },
  { label: 'Failed', value: 'failed' },
];

function SourceTypePill({ type }: { type: string }) {
  return (
    <span className="rounded-md border border-slate-700 bg-slate-800/50 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-slate-400">
      {type}
    </span>
  );
}

export function DocumentsManager() {
  const [filter, setFilter] = useState<DocumentStatus | 'all'>('all');
  const [viewing, setViewing] = useState<DocumentResponse | null>(null);
  const [deleting, setDeleting] = useState<DocumentResponse | null>(null);

  const { data, isLoading, error } = useDocuments(
    filter === 'all' ? undefined : filter
  );
  const { mutate: removeDocument, isPending: isDeleting } = useDeleteDocument();

  const documents = data?.items ?? [];
  const inFlightCount = documents.filter(
    (d) => d.status === 'pending' || d.status === 'processing'
  ).length;

  const handleConfirmDelete = () => {
    if (!deleting) return;
    removeDocument(deleting.id, {
      onSettled: () => setDeleting(null),
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-cyan-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <h1 className="text-3xl font-bold text-white">Documents</h1>
        <p className="mt-2 text-slate-400">
          Upload proprietary docs to your vault. Ingestion runs asynchronously —
          chunking and embedding happen in the background.
        </p>
      </div>

      {/* Upload */}
      <div className="mb-6">
        <UploadDropzone />
      </div>

      {/* Async pipeline hint */}
      {inFlightCount > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
          <p className="text-sm text-slate-300">
            {inFlightCount} document{inFlightCount === 1 ? '' : 's'} processing.
            New uploads start as <span className="font-medium">pending</span>,
            then a background worker extracts text, splits it into chunks, and
            generates embeddings — flipping them to{' '}
            <span className="font-medium text-emerald-400">ready</span>. This
            list refreshes automatically; viewing chunks unlocks once a document
            is ready.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
              filter === f.value
                ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-300'
                : 'border-slate-700 text-slate-400 hover:bg-slate-800'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
        {isLoading ? (
          <div className="space-y-px">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-slate-800" />
                  <div className="h-3 w-1/4 animate-pulse rounded bg-slate-800/60" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-red-400">
            Failed to load documents. Please try again.
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-slate-600" />
            <h3 className="mb-2 text-lg font-semibold text-white">
              No documents {filter !== 'all' ? `in "${filter}"` : 'yet'}
            </h3>
            <p className="text-slate-400">
              Upload a document above to start building your knowledge vault.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-left text-sm text-slate-400">
                  <th className="px-6 py-3 font-medium">Document</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Chunks</th>
                  <th className="px-6 py-3 font-medium">Uploaded</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="text-sm transition-colors hover:bg-slate-800/30"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800">
                          <FileText className="h-4 w-4 text-slate-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">
                            {doc.title}
                          </p>
                          {doc.status === 'failed' && doc.error_message && (
                            <p className="truncate text-xs text-red-400">
                              {doc.error_message}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <SourceTypePill type={doc.source_type} />
                    </td>
                    <td className="px-6 py-4">
                      <DocumentStatusBadge status={doc.status} />
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {doc.chunk_count}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {doc.created_at ? formatDateTime(doc.created_at) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewing(doc)}
                          disabled={doc.status !== 'ready'}
                          title={
                            doc.status === 'ready'
                              ? 'View chunks'
                              : 'Available once ready'
                          }
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(doc)}
                          title="Delete document"
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Chunks drawer */}
      <DocumentChunksDrawer
        document={viewing}
        onClose={() => setViewing(null)}
      />

      {/* Delete confirm */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-lg border border-slate-800 bg-slate-900">
            <div className="border-b border-slate-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">
                Delete document
              </h2>
            </div>
            <div className="px-6 py-4">
              <p className="mb-2 text-slate-300">
                Delete{' '}
                <span className="font-semibold text-white">
                  {deleting.title}
                </span>
                ? This purges its vectors, chunks, and stored file.
              </p>
              <p className="text-sm text-slate-400">
                The AI will no longer use it to answer questions. This cannot be
                undone.
              </p>
            </div>
            <div className="flex gap-3 border-t border-slate-800 px-6 py-4">
              <button
                onClick={() => setDeleting(null)}
                disabled={isDeleting}
                className="flex-1 rounded-lg border border-slate-700 px-4 py-2 text-slate-300 transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
