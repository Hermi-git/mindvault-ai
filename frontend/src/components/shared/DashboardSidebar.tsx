'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Search,
  MessageSquare,
  Users,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth, useLogout } from '@/hooks/useAuth';
import { OrgSwitcher } from '@/components/shared/OrgSwitcher';
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
    label: 'Search',
    href: '/dashboard/search',
    icon: Search,
  },
  {
    label: 'Chat',
    href: '/dashboard/chat',
    icon: MessageSquare,
    disabled: true,
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
      <div className="border-b border-slate-800">
        <OrgSwitcher />
      </div>

      <SidebarSeparator />

      {/* Navigation Items */}
      <SidebarContent>
        <SidebarMenu>
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            if (item.disabled) {
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    disabled
                    className="cursor-not-allowed opacity-50"
                    tooltip="Coming soon"
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                    <span className="ml-auto rounded bg-slate-700/60 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                      Soon
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            }

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
