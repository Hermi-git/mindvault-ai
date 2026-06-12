'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Search, Loader2, FileText, Sparkles } from 'lucide-react';
import { useSemanticSearch } from '@/hooks/useSearch';
import type { Citation, SearchChunk } from '@/services/api';

function formatCitation(c: Citation): string {
  const parts: string[] = [c.source || 'Unknown source'];
  if (c.page_number != null) parts.push(`p. ${c.page_number}`);
  if (c.line_from != null) {
    parts.push(
      c.line_to != null && c.line_to !== c.line_from
        ? `lines ${c.line_from}–${c.line_to}`
        : `line ${c.line_from}`
    );
  }
  return parts.join(' · ');
}

function ScorePill({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null;
  return (
    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
      {label} {value.toFixed(3)}
    </span>
  );
}

function ResultCard({
  chunk,
  rank,
  expanded,
  onToggle,
}: {
  chunk: SearchChunk;
  rank: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="rounded-xl border border-slate-800 bg-slate-900/50 transition-colors hover:border-slate-700">
      <button
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-5 py-4 text-left"
      >
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-300">
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2 text-sm">
            <FileText className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
            <span className="truncate font-medium text-cyan-300">
              {formatCitation(chunk.citation)}
            </span>
          </div>
          <p
            className={cn(
              'text-sm leading-relaxed text-slate-300',
              !expanded && 'line-clamp-3'
            )}
          >
            {chunk.text}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
              score {chunk.score.toFixed(3)}
            </span>
            <ScorePill label="vec" value={chunk.vector_score} />
            <ScorePill label="kw" value={chunk.key_score} />
            <ScorePill label="rerank" value={chunk.rerank_score} />
          </div>
        </div>
      </button>
    </li>
  );
}

export function SemanticSearch() {
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { mutate, data, isPending, error, reset } = useSemanticSearch();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setExpandedId(null);
    mutate({ query: trimmed, topK: 10 });
  };

  const results = data?.items ?? [];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-3xl font-bold text-white">
          Semantic search
          <Sparkles className="h-6 w-6 text-cyan-400" />
        </h1>
        <p className="mt-2 text-slate-400">
          Search your vault by meaning, not keywords. Pure vector retrieval — no
          LLM, no generation, just the passages that match.
        </p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value) reset();
            }}
            placeholder="e.g. What is our parental leave policy?"
            className="w-full rounded-xl border border-slate-700 bg-slate-900/60 py-3.5 pl-12 pr-32 text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
          />
          <button
            type="submit"
            disabled={isPending || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-400 px-4 py-2 text-sm font-medium text-white transition-all hover:shadow-lg hover:shadow-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Search'
            )}
          </button>
        </div>
      </form>

      {/* Results */}
      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          Search failed. Please try again.
        </div>
      ) : isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-slate-800 bg-slate-900/40"
            />
          ))}
        </div>
      ) : data ? (
        results.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center">
            <Search className="mx-auto mb-4 h-12 w-12 text-slate-600" />
            <h3 className="mb-2 text-lg font-semibold text-white">
              No matches found
            </h3>
            <p className="text-slate-400">
              Try rephrasing, or upload more documents to your vault.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-slate-400">
              {results.length} passage{results.length === 1 ? '' : 's'} found
            </p>
            <ul className="space-y-3">
              {results.map((chunk, idx) => (
                <ResultCard
                  key={chunk.id}
                  chunk={chunk}
                  rank={idx + 1}
                  expanded={expandedId === chunk.id}
                  onToggle={() =>
                    setExpandedId((prev) =>
                      prev === chunk.id ? null : chunk.id
                    )
                  }
                />
              ))}
            </ul>
          </>
        )
      ) : (
        <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center">
          <Sparkles className="mx-auto mb-4 h-10 w-10 text-slate-600" />
          <p className="text-slate-400">
            Enter a question above to search across all your documents.
          </p>
        </div>
      )}
    </div>
  );
}
