'use client';

import { cn } from '@/lib/utils';
import { FileText, MessageSquare, Zap, Users, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// Stat Card Component
function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendLabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: string;
  trendLabel?: string;
}) {
  const isTrendPositive = trend?.startsWith('+');

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400 mb-2">{label}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
        </div>
        <div className="text-slate-600">
          {Icon}
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-2">
          <TrendingUp
            className={cn(
              'w-4 h-4',
              isTrendPositive ? 'text-emerald-500' : 'text-red-500'
            )}
          />
          <span
            className={cn(
              'text-sm font-medium',
              isTrendPositive ? 'text-emerald-500' : 'text-red-500'
            )}
          >
            {trend}
          </span>
          {trendLabel && (
            <span className="text-xs text-slate-400">{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function DashboardOverview() {
  const { user } = useAuth();
  
  // Get user's first name for greeting (fallback to full name or email)
  const displayName = user?.full_name 
    ? user.full_name.split(' ')[0] // Get first name
    : user?.user_id?.slice(0, 8) || 'there';

  // Mock data - will be replaced with actual API calls
  const stats = [
    {
      icon: <FileText className="w-8 h-8" />,
      label: 'Documents',
      value: 142,
      trend: '+12',
      trendLabel: 'this week',
    },
    {
      icon: <MessageSquare className="w-8 h-8" />,
      label: 'Queries (7d)',
      value: '2,620',
      trend: '+18.2%',
      trendLabel: 'vs last week',
    },
    {
      icon: <Zap className="w-8 h-8" />,
      label: 'Tokens used (7d)',
      value: '1.22M',
      trend: '+9.4%',
      trendLabel: 'vs last week',
    },
    {
      icon: <Users className="w-8 h-8" />,
      label: 'Active members',
      value: 12,
      trend: '+2',
      trendLabel: 'invited',
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back, {displayName}
        </h1>
        <p className="text-slate-400">
          Here's what's happening in your knowledge vault today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, idx) => (
          <StatCard key={idx} {...stat} />
        ))}
      </div>

      {/* Charts Section (Placeholder for future implementation) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Query Volume Chart */}
        <div className="lg:col-span-2 rounded-lg border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white mb-4">Query volume</h3>
          <p className="text-sm text-slate-400 mb-4">Last 7 days</p>
          <div className="h-64 flex items-center justify-center text-slate-400">
            <p>Chart placeholder - Coming soon</p>
          </div>
        </div>

        {/* Most Queried Documents */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white mb-4">Most queried</h3>
          <p className="text-sm text-slate-400 mb-4">This month</p>
          <div className="space-y-3">
            {['Employee_Handbook_2025.pdf', 'API_Documentation.md', 'Security_Compliance_Policy.pdf'].map(
              (doc, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-2 rounded hover:bg-slate-800/30 transition-colors"
                >
                  <FileText className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {doc}
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-white mb-4">Recent ingest</h3>
        <p className="text-sm text-slate-400 mb-4">Latest documents added to your vault</p>
        <div className="space-y-3">
          {[
            { name: 'Employee_Handbook_2025.pdf', user: 'Sarah Chen', time: '2 hours ago', size: '4.2 MB' },
            { name: 'Q4_Engineering_Roadmap.pdf', user: 'Marcus Reed', time: '5 hours ago', size: '2.1 MB' },
          ].map((doc, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded hover:bg-slate-800/30 transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-white">{doc.name}</p>
                  <p className="text-xs text-slate-400">
                    {doc.user} · {doc.time}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">{doc.size}</p>
                <span className="inline-block mt-1 px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                  Ready
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
