import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  PhoneCall,
  Clock,
  TrendingUp,
  FileBarChart,
  LogOut,
  X,
  ShieldCheck,
  Headphones,
} from 'lucide-react';
import { Role } from '@/types';
import type { NavItem } from '@/types';
import { useAuth } from '@/context';

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const adminNavItems: NavItem[] = [
  { to: '/admin/overview', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/leads', label: 'All Leads', icon: Users },
  { to: '/admin/assign', label: 'Assign Leads', icon: UserCheck },
  { to: '/admin/calls', label: 'Call History', icon: PhoneCall },
  { to: '/admin/follow-ups', label: 'Follow-ups', icon: Clock },
  { to: '/admin/performance', label: 'Sales Performance', icon: TrendingUp },
  { to: '/admin/reports', label: 'Reports', icon: FileBarChart },
];

const executiveNavItems: NavItem[] = [
  { to: '/executive/dashboard', label: 'My Dashboard', icon: LayoutDashboard },
  { to: '/executive/leads', label: 'My Leads', icon: Users },
  { to: '/executive/calls', label: 'Call History', icon: PhoneCall },
  { to: '/executive/follow-ups', label: 'Follow-ups', icon: Clock },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, role, logout, setRoleForPreview } = useAuth();

  const isExecutive = role === Role.SALES_EXECUTIVE;
  const navItems = isExecutive ? executiveNavItems : adminNavItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/60 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col bg-[#111827] text-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-800/80 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 font-bold text-white shadow-sm">
              PG
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-white">
                PGfy CRM
              </div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                Sales & Call Tracking
              </div>
            </div>
          </div>
          {/* Mobile close button */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Role Mode Banner & Switcher */}
        <div className="border-b border-gray-800/60 px-4 py-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
              {isExecutive ? (
                <Headphones className="h-3.5 w-3.5 text-blue-400" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
              )}
              {isExecutive ? 'Executive View' : 'Admin Portal'}
            </span>

            {/* Quick role-switch toggle for previewing */}
            <button
              type="button"
              onClick={() =>
                setRoleForPreview(
                  isExecutive ? Role.ADMIN : Role.SALES_EXECUTIVE
                )
              }
              title="Toggle role view for preview"
              className="rounded bg-gray-800 px-2 py-0.5 text-[11px] font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              Switch to {isExecutive ? 'Admin' : 'Exec'}
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            {isExecutive ? 'Sales Workspace' : 'Management'}
          </div>
          {navItems.map(({ to, label, icon: Icon, badge }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => {
                if (window.innerWidth < 1024) onClose();
              }}
              className={({ isActive }) =>
                `group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-300 hover:bg-gray-800/80 hover:text-white'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span>{label}</span>
              </div>
              {badge !== undefined && (
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-semibold text-blue-300">
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Profile & Logout (Bottom) */}
        <div className="border-t border-gray-800/80 p-3">
          <div className="mb-2 flex items-center gap-3 rounded-lg bg-gray-800/40 p-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-sm font-bold text-blue-400 border border-blue-400/20">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-white">
                {user?.name || 'Authorized User'}
              </div>
              <div className="truncate text-[11px] text-gray-400">
                {user?.email || 'user@pgfy.demo'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700/60 bg-gray-800/60 px-3 py-2 text-xs font-medium text-gray-300 hover:bg-rose-900/40 hover:border-rose-700/60 hover:text-rose-200 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
