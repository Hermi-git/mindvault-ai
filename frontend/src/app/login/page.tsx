'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/features/auth';
import { useAuth } from '@/hooks';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

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
        <LoginForm />
      </div>
    </div>
  );
}
