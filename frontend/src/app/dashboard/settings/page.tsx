'use client';

import { MfaSettings } from '@/components/features/dashboard/settings/MfaSettings';

export default function SettingsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-slate-400">
          Manage your workspace settings and preferences.
        </p>
      </div>

      {/* Settings Cards */}
      <div className="space-y-6 max-w-2xl">
        {/* Security / MFA */}
        <MfaSettings />

        {/* Organization Settings */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Organization</h2>
          <p className="text-sm text-slate-400 mb-4">
            Update your organization name, logo, and branding.
          </p>
          <button className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors font-medium text-sm">
            Edit organization
          </button>
        </div>

        {/* API Keys */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-2">API Keys</h2>
          <p className="text-sm text-slate-400 mb-4">
            Generate and manage API keys for programmatic access.
          </p>
          <button className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors font-medium text-sm">
            Manage API keys
          </button>
        </div>

        {/* Billing */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Billing & plan</h2>
          <p className="text-sm text-slate-400 mb-4">
            View your current plan and manage your subscription.
          </p>
          <button className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors font-medium text-sm">
            View billing
          </button>
        </div>

        {/* Integrations */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Integrations</h2>
          <p className="text-sm text-slate-400 mb-4">
            Connect third-party tools and services.
          </p>
          <button className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors font-medium text-sm">
            Manage integrations
          </button>
        </div>
      </div>
    </div>
  );
}
