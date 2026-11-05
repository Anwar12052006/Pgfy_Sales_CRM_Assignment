import React from 'react';
import { Menu, Bell, Shield, Headphones, LogOut } from 'lucide-react';
import { useAuth } from '@/context';
import { Role } from '@/types';
import { StatusBadge } from './StatusBadge';

export interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, role, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 lg:px-8">
      {/* Left: Hamburger menu for mobile + Workspace context */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 focus:outline-none lg:hidden"
          title="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden items-center gap-2 sm:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-medium text-gray-500">
            Internal Sales CRM &middot; Bengaluru Region
          </span>
        </div>
      </div>

      {/* Right: Notifications, Role indicator, User profile, Logout */}
      <div className="flex items-center gap-3">
        {/* Role badge */}
        <div className="hidden sm:block">
          <StatusBadge status={role || Role.ADMIN} size="sm" />
        </div>

        {/* Notification pill placeholder */}
        <button
          type="button"
          className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600 focus:outline-none"
          title="Notifications"
        >
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
        </button>

        <div className="h-5 w-px bg-gray-200" />

        {/* User Info */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-700 font-semibold text-xs border border-blue-200">
            {role === Role.ADMIN ? (
              <Shield className="h-4 w-4" />
            ) : (
              <Headphones className="h-4 w-4" />
            )}
          </div>
          <div className="hidden text-left md:block">
            <div className="text-xs font-semibold text-gray-900 leading-tight">
              {user?.name || 'CRM User'}
            </div>
            <div className="text-[11px] text-gray-500 leading-tight">
              {user?.email || 'sales@pgfy.demo'}
            </div>
          </div>
        </div>

        {/* Logout button */}
        <button
          type="button"
          onClick={logout}
          className="rounded-lg p-2 text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition-colors focus:outline-none"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
