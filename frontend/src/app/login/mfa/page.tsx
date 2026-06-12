'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { useVerifyMfa } from '@/hooks/useMfa';
import { ErrorMessage } from '@/components/shared/ErrorMessage';

function MfaForm() {
  const router = useRouter();
  const params = useSearchParams();
  const attemptToken = params.get('token') ?? '';
  const [code, setCode] = useState('');
  const { mutate, isPending, error } = useVerifyMfa();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 6) return;
    mutate({ attemptToken, code: code.trim() });
  };

  if (!attemptToken) {
    return (
      <div className="w-full max-w-md text-center">
        <p className="mb-4 text-slate-300">
          This verification link is missing its session token.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="text-cyan-400 hover:text-cyan-300"
        >
          ← Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Two-factor</h1>
          <p className="text-sm text-slate-400">
            Enter the 6-digit code from your authenticator app.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="code"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Verification code
          </label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, '').slice(0, 8))
            }
            placeholder="123456"
            className="w-full rounded-lg border border-slate-700/50 bg-slate-900/50 px-4 py-3 text-center text-2xl tracking-[0.5em] text-white placeholder:text-slate-600 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
          />
        </div>

        {error && (
          <ErrorMessage
            message={
              (error as { response?: { data?: { detail?: string } } })?.response
                ?.data?.detail || 'Invalid or expired code. Please try again.'
            }
            type="error"
            dismissible={false}
          />
        )}

        <button
          type="submit"
          disabled={isPending || code.length < 6}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-400 px-4 py-2.5 font-semibold text-white transition-all hover:shadow-lg hover:shadow-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending ? 'Verifying…' : 'Verify & sign in'}
        </button>

        <button
          type="button"
          onClick={() => router.push('/login')}
          className="w-full text-center text-sm text-slate-400 hover:text-slate-300"
        >
          ← Back to sign in
        </button>
      </form>
    </div>
  );
}

export default function MfaPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <Suspense
        fallback={
          <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
        }
      >
        <MfaForm />
      </Suspense>
    </div>
  );
}
