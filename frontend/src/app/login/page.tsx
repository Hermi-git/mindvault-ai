import Link from 'next/link';
import { cn } from '@/lib/cn';

export default function LoginPage() {
  return (
    <div className={cn(
      'min-h-screen bg-slate-950 flex items-center justify-center',
      'px-6 py-20'
    )}>
      <div className={cn(
        'w-full max-w-md p-8 rounded-xl',
        'bg-white/5 border border-slate-700/30',
        'backdrop-blur-sm'
      )}>
        <h1 className="text-3xl font-bold text-slate-50 mb-2">Sign In</h1>
        <p className="text-slate-400 mb-8">Welcome back to MindVault</p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              className={cn(
                'w-full px-4 py-2 rounded-lg',
                'bg-white/5 border border-slate-700',
                'text-slate-50 placeholder-slate-500',
                'focus:outline-none focus:border-cyan-400/50'
              )}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className={cn(
                'w-full px-4 py-2 rounded-lg',
                'bg-white/5 border border-slate-700',
                'text-slate-50 placeholder-slate-500',
                'focus:outline-none focus:border-cyan-400/50'
              )}
            />
          </div>

          <button className={cn(
            'w-full px-4 py-2 rounded-lg font-semibold',
            'bg-gradient-to-r from-indigo-600 to-cyan-400',
            'text-white hover:shadow-lg hover:shadow-indigo-500/50',
            'transition-all duration-300'
          )}>
            Sign In
          </button>
        </div>

        <p className="text-center text-slate-400 text-sm mt-8">
          Don't have an account?{' '}
          <Link href="/register" className="text-cyan-400 hover:text-cyan-300">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
