import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: {
    value: string | number;
    isPositive: boolean;
    label?: string;
  };
  subtitle?: string;
  variant?: 'blue' | 'indigo' | 'emerald' | 'amber' | 'purple' | 'rose' | 'slate';
  loading?: boolean;
}

const variantStyles = {
  blue: {
    iconBg: 'bg-blue-50 text-blue-600 border border-blue-100',
  },
  indigo: {
    iconBg: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
  },
  emerald: {
    iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  },
  amber: {
    iconBg: 'bg-amber-50 text-amber-600 border border-amber-100',
  },
  purple: {
    iconBg: 'bg-purple-50 text-purple-600 border border-purple-100',
  },
  rose: {
    iconBg: 'bg-rose-50 text-rose-600 border border-rose-100',
  },
  slate: {
    iconBg: 'bg-slate-50 text-slate-600 border border-slate-100',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  change,
  subtitle,
  variant = 'blue',
  loading = false,
}) => {
  const styles = variantStyles[variant];

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 w-24 bg-gray-200 rounded" />
          <div className="h-10 w-10 bg-gray-100 rounded-lg" />
        </div>
        <div className="h-8 w-32 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-20 bg-gray-100 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow transition-shadow duration-150">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <div className={`p-2.5 rounded-lg ${styles.iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-gray-900">
          {value}
        </span>
      </div>

      {(change || subtitle) && (
        <div className="mt-2.5 flex items-center text-xs text-gray-500 gap-1.5">
          {change && (
            <span
              className={`inline-flex items-center font-medium ${
                change.isPositive ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {change.isPositive ? (
                <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5 mr-0.5" />
              )}
              {change.value}
            </span>
          )}
          {change?.label && <span>{change.label}</span>}
          {subtitle && !change && <span>{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
