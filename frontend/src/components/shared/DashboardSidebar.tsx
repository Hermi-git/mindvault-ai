'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Users,
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useAuth, useLogout } from '@/hooks/useAuth';
import { useState } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';

const SIDEBAR_ITEMS = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Documents',
    href: '/dashboard/documents',
    icon: FileText,
  },
  {
    label: 'Chat',
    href: '/dashboard/chat',
    icon: MessageSquare,
  },
  {
    label: 'Team',
    href: '/dashboard/team',
    icon: Users,
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { mutate: handleLogout, isPending: isLoggingOut } = useLogout();
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);

  return (
    <Sidebar>
      {/* Logo Section */}
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-linear-to-br from-indigo-500 to-cyan-400 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">MV</span>
          </div>
          <span className="text-white font-bold">MindVault</span>
        </Link>
      </SidebarHeader>

      {/* Organization Selector */}
      <div className="px-4 py-4 border-b border-slate-800">
        <button
          onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0">
              AC
            </div>
            <div className="text-left min-w-0">
              <p className="text-sm font-medium text-white truncate">Acme Corp</p>
              <p className="text-xs text-slate-400">Business plan</p>
            </div>
          </div>
          <ChevronDown className={cn(
            'w-4 h-4 text-slate-400 transition-transform shrink-0',
            orgDropdownOpen && 'rotate-180'
          )} />
        </button>

        {/* Organization Dropdown */}
        {orgDropdownOpen && (
          <div className="mt-2 rounded-lg bg-slate-800 border border-slate-700 py-2">
            <p className="text-xs text-slate-400 px-3 py-2">Switch Organization</p>
          </div>
        )}
      </div>

      <SidebarSeparator />

      {/* Navigation Items */}
      <SidebarContent>
        <SidebarMenu>
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                >
                  <Link href={item.href}>
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      {/* Footer - User Section */}
      <SidebarFooter>
        <SidebarSeparator />
        
        {/* User Info */}
        <div className="px-4 py-3 rounded-lg bg-slate-800/30">
          <p className="text-xs text-slate-400 mb-1">Account</p>
          <p className="text-sm font-medium text-white truncate">{user?.full_name || user?.user_id?.slice(0, 8) || 'User'}</p>
          <p className="text-xs text-slate-400 capitalize mt-1">{user?.role || 'member'}</p>
        </div>

        {/* Logout Button */}
        <button
          onClick={() => handleLogout()}
          disabled={isLoggingOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-slate-300 hover:bg-red-600/10 hover:text-red-400 disabled:opacity-50"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">
            {isLoggingOut ? 'Logging out...' : 'Log out'}
          </span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
