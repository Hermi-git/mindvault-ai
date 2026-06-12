'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Check, Loader2, Building2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  useOrganizations,
  useSwitchOrganization,
} from '@/hooks/useOrganizations';
import type { Organization } from '@/services/api';

function orgInitials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'OR'
  );
}

export function OrgSwitcher() {
  const { user } = useAuth();
  const { data, isLoading } = useOrganizations();
  const { mutate: switchOrg, isPending, variables } = useSwitchOrganization();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const orgs = data?.items ?? [];
  const active: Organization | undefined =
    orgs.find((o) => o.id === user?.org_id) ?? orgs[0];

  const handleSelect = (org: Organization) => {
    if (org.id === user?.org_id) {
      setOpen(false);
      return;
    }
    switchOrg(org.id, { onSettled: () => setOpen(false) });
  };

  return (
    <div ref={ref} className="relative px-4 py-4">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isLoading}
        className="flex w-full items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2 transition-colors hover:bg-slate-800 disabled:opacity-60"
      >
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
            {active ? orgInitials(active.name) : <Building2 className="h-4 w-4" />}
          </div>
          <div className="min-w-0 text-left">
            <p className="truncate text-sm font-medium text-white">
              {isLoading ? 'Loading…' : active?.name ?? 'No organization'}
            </p>
            {active && (
              <p className="text-xs capitalize text-slate-400">
                {active.role.toLowerCase()}
              </p>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-slate-400 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="absolute left-4 right-4 z-20 mt-2 overflow-hidden rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl">
          <p className="px-3 py-2 text-xs font-medium text-slate-400">
            Switch organization
          </p>
          {orgs.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-400">
              No organizations.
            </p>
          ) : (
            orgs.map((org) => {
              const isActive = org.id === user?.org_id;
              const isSwitching = isPending && variables === org.id;
              return (
                <button
                  key={org.id}
                  onClick={() => handleSelect(org)}
                  disabled={isPending}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-slate-700/60 disabled:opacity-60"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-700 text-[10px] font-bold text-white">
                    {orgInitials(org.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {org.name}
                    </p>
                    <p className="text-xs capitalize text-slate-400">
                      {org.role.toLowerCase()}
                    </p>
                  </div>
                  {isSwitching ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-cyan-400" />
                  ) : isActive ? (
                    <Check className="h-4 w-4 shrink-0 text-cyan-400" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
