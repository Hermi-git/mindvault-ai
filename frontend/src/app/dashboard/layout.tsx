'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { DashboardSidebar } from '@/components/shared/DashboardSidebar';
import { cn } from '@/lib/utils';
import {
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn(
        'min-h-screen bg-slate-950 flex items-center justify-center',
        'px-6'
      )}>
        <div className="text-center">
          <div className="mb-4 inline-block w-12 h-12 border-4 border-slate-700 border-t-cyan-400 rounded-full animate-spin" />
          <p className="text-slate-300">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset>
        <div className="bg-slate-950 min-h-screen">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
