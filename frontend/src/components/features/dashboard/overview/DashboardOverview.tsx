'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  FileText,
  Zap,
  Activity,
  CheckCircle2,
  Loader2,
  Search,
  Upload,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUsage } from '@/hooks/useUsage';
import { useDocuments } from '@/hooks/useDocuments';
import { DocumentStatusBadge } from '@/components/features/dashboard/documents/DocumentStatusBadge';
import { formatDateTime } from '@/lib/utils/helpers';

function compactNumber(n: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n);
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  loading?: boolean;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="mb-2 text-sm text-slate-400">{label}</p>
          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded bg-slate-800" />
          ) : (
            <p className="text-3xl font-bold text-white">{value}</p>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {hint && <p className="mt-3 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export default function DashboardOverview() {
  const { user } = useAuth();
  const { data: usage, isLoading: usageLoading } = useUsage();
  const { data: docsData, isLoading: docsLoading } = useDocuments();

  const displayName = user?.full_name
    ? user.full_name.split(' ')[0]
    : 'there';

  const documents = docsData?.items ?? [];
  const readyCount = documents.filter((d) => d.status === 'ready').length;
  const processingCount = documents.filter(
    (d) => d.status === 'pending' || d.status === 'processing'
  ).length;
  const recent = [...documents]
    .sort((a, b) =>
      (b.created_at ?? '').localeCompare(a.created_at ?? '')
    )
    .slice(0, 5);

  const periodLabel = usage?.period_start
    ? new Date(usage.period_start).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'this month';

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          Welcome back, {displayName}
        </h1>
        <p className="mt-2 text-slate-400">
          Here&apos;s what&apos;s happening in your knowledge vault.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={FileText}
          label="Documents"
          value={docsLoading ? '' : compactNumber(docsData?.total ?? 0)}
          loading={docsLoading}
          hint={`${readyCount} ready · ${processingCount} in progress`}
        />
        <StatCard
          icon={Zap}
          label={`Tokens used (${periodLabel})`}
          value={usageLoading ? '' : compactNumber(usage?.total_tokens ?? 0)}
          loading={usageLoading}
          hint="Embedding + chat usage"
        />
        <StatCard
          icon={Activity}
          label="Billable events"
          value={usageLoading ? '' : compactNumber(usage?.total_events ?? 0)}
          loading={usageLoading}
          hint={`Uploads & queries ${periodLabel}`}
        />
        <StatCard
          icon={CheckCircle2}
          label="Documents ingested"
          value={usageLoading ? '' : compactNumber(usage?.total_documents ?? 0)}
          loading={usageLoading}
          hint="Counted toward your plan"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent ingest */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Recent ingest</h3>
            <Link
              href="/dashboard/documents"
              className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {docsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-lg bg-slate-800/50"
                />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="py-10 text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-slate-600" />
              <p className="mb-4 text-sm text-slate-400">
                No documents yet. Upload your first to get started.
              </p>
              <Link
                href="/dashboard/documents"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-400 px-4 py-2 text-sm font-medium text-white"
              >
                <Upload className="h-4 w-4" /> Upload document
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {recent.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-slate-800/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText className="h-5 w-5 shrink-0 text-slate-500" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {doc.title}
                      </p>
                      <p className="text-xs text-slate-400">
                        {doc.created_at
                          ? formatDateTime(doc.created_at)
                          : '—'}
                      </p>
                    </div>
                  </div>
                  <DocumentStatusBadge status={doc.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick actions */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-white">
            Quick actions
          </h3>
          <div className="space-y-3">
            <Link
              href="/dashboard/documents"
              className="flex items-center gap-3 rounded-lg border border-slate-800 p-3 transition-colors hover:bg-slate-800/40"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300">
                <Upload className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  Upload documents
                </p>
                <p className="text-xs text-slate-400">
                  PDF, DOCX, Markdown, TXT
                </p>
              </div>
            </Link>
            <Link
              href="/dashboard/search"
              className="flex items-center gap-3 rounded-lg border border-slate-800 p-3 transition-colors hover:bg-slate-800/40"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-300">
                <Search className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  Semantic search
                </p>
                <p className="text-xs text-slate-400">Find passages by meaning</p>
              </div>
            </Link>
          </div>

          <div className="mt-6 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
            <div className="flex items-center gap-2">
              {processingCount > 0 ? (
                <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              )}
              <p className="text-sm text-slate-300">
                {processingCount > 0
                  ? `${processingCount} document${processingCount === 1 ? '' : 's'} ingesting…`
                  : 'All documents ingested'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
