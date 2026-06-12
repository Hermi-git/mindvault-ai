'use client';

import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, Loader2, AlertTriangle } from 'lucide-react';
import type { DocumentStatus } from '@/services/api';

const CONFIG: Record<
  DocumentStatus,
  { label: string; className: string; icon: React.ElementType; spin?: boolean }
> = {
  ready: {
    label: 'Ready',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icon: CheckCircle2,
  },
  processing: {
    label: 'Processing',
    className: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    icon: Loader2,
    spin: true,
  },
  pending: {
    label: 'Pending',
    className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    icon: Clock,
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-500/15 text-red-400 border-red-500/30',
    icon: AlertTriangle,
  },
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const config = CONFIG[status] ?? CONFIG.pending;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        config.className
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', config.spin && 'animate-spin')} />
      {config.label}
    </span>
  );
}
