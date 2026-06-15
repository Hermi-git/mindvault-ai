'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Copy, Check, Loader2 } from 'lucide-react';
import { useEnrollMfa, useEnableMfa } from '@/hooks/useMfa';
import { copyToClipboard } from '@/lib/utils/helpers';

type Step = 'idle' | 'enrolling' | 'confirm' | 'done';

export function MfaSettings() {
  const [step, setStep] = useState<Step>('idle');
  const [secret, setSecret] = useState('');
  const [uri, setUri] = useState('');
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const { mutate: enroll, isPending: isEnrolling } = useEnrollMfa();
  const { mutate: enable, isPending: isEnabling } = useEnableMfa();

  const startEnroll = () => {
    setConfirmError(null);
    enroll(undefined, {
      onSuccess: (data) => {
        setSecret(data.secret);
        setUri(data.provisioning_uri);
        setStep('confirm');
      },
      onError: () => setConfirmError('Could not start enrollment. Try again.'),
    });
  };

  const confirmEnable = () => {
    setConfirmError(null);
    enable(code.trim(), {
      onSuccess: () => setStep('done'),
      onError: (err) =>
        setConfirmError(
          (err as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail || 'Invalid code. Please try again.'
        ),
    });
  };

  const handleCopy = async () => {
    if (await copyToClipboard(secret)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
      <div className="mb-2 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-cyan-400" />
        <h2 className="text-lg font-semibold text-white">
          Two-factor authentication
        </h2>
      </div>
      <p className="mb-4 text-sm text-slate-400">
        Add a TOTP authenticator app (Google Authenticator, 1Password, Authy) as
        a second factor when signing in.
      </p>

      {step === 'idle' && (
        <button
          onClick={startEnroll}
          disabled={isEnrolling}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 disabled:opacity-50"
        >
          {isEnrolling && <Loader2 className="h-4 w-4 animate-spin" />}
          Set up two-factor
        </button>
      )}

      {step === 'confirm' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-xs text-yellow-200/90">
            Starting setup generates a <strong>new</strong> secret each time. If
            you tried before, delete any old &quot;MindVault AI&quot; entries in
            your authenticator app first — an outdated entry produces codes that
            will be rejected.
          </div>
          <div>
            <p className="mb-3 text-sm text-slate-300">
              1. Scan this QR code with your authenticator app (or enter the
              secret manually):
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="w-fit rounded-lg bg-white p-3">
                {uri && <QRCodeSVG value={uri} size={148} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-xs text-slate-500">Manual entry key</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 font-mono text-sm text-cyan-300">
                    {secret}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="shrink-0 rounded-lg border border-slate-700 p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                    title="Copy secret"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">
              2. Enter the 6-digit code your app shows{' '}
              <span className="text-slate-500">
                (it changes every 30s — don&apos;t type the placeholder)
              </span>
              :
            </label>
            <input
              inputMode="numeric"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, '').slice(0, 8))
              }
              placeholder="000000"
              className="w-40 rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2 text-center text-lg tracking-widest text-white placeholder:text-slate-600 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
            />
          </div>

          {confirmError && (
            <p className="text-sm text-red-400">{confirmError}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => {
                setStep('idle');
                setCode('');
              }}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={confirmEnable}
              disabled={isEnabling || code.length < 6}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-400 px-4 py-2 text-sm font-medium text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isEnabling && <Loader2 className="h-4 w-4 animate-spin" />}
              Enable
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <Check className="h-5 w-5 text-emerald-400" />
          <p className="text-sm text-emerald-300">
            Two-factor authentication is now enabled on your account.
          </p>
        </div>
      )}
    </div>
  );
}
