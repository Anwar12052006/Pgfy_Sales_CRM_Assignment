import React from 'react';
import { LeadStatus, Role, FollowUpStatus } from '@/types';

type BadgeType = LeadStatus | Role | FollowUpStatus | string;

interface StatusBadgeProps {
  status: BadgeType;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  className = '',
}) => {
  const getBadgeStyle = (val: string): { bg: string; text: string; dot: string; label: string } => {
    switch (val) {
      // Lead Statuses
      case LeadStatus.NEW:
        return { bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500', label: 'New' };
      case LeadStatus.CONTACTED:
        return { bg: 'bg-cyan-50 text-cyan-700 border-cyan-200', text: 'text-cyan-700', dot: 'bg-cyan-500', label: 'Contacted' };
      case LeadStatus.INTERESTED:
        return { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Interested' };
      case LeadStatus.NOT_INTERESTED:
        return { bg: 'bg-rose-50 text-rose-700 border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500', label: 'Not Interested' };
      case LeadStatus.FOLLOW_UP:
        return { bg: 'bg-purple-50 text-purple-700 border-purple-200', text: 'text-purple-700', dot: 'bg-purple-500', label: 'Follow Up' };
      case LeadStatus.VISIT_SCHEDULED:
        return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', text: 'text-indigo-700', dot: 'bg-indigo-500', label: 'Visit Scheduled' };
      case LeadStatus.CONVERTED:
        return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Converted' };
      case LeadStatus.LOST:
        return { bg: 'bg-slate-100 text-slate-700 border-slate-200', text: 'text-slate-700', dot: 'bg-slate-500', label: 'Lost' };

      // Roles
      case Role.ADMIN:
        return { bg: 'bg-violet-50 text-violet-700 border-violet-200', text: 'text-violet-700', dot: 'bg-violet-500', label: 'Admin' };
      case Role.SALES_EXECUTIVE:
        return { bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Executive' };

      // Follow-up Statuses
      case FollowUpStatus.PENDING:
        return { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Pending' };
      case FollowUpStatus.COMPLETED:
        return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Completed' };
      case FollowUpStatus.CANCELLED:
        return { bg: 'bg-gray-100 text-gray-700 border-gray-200', text: 'text-gray-700', dot: 'bg-gray-500', label: 'Cancelled' };

      // Call Outcomes
      case 'CONNECTED':
        return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Connected' };
      case 'NOT_ANSWERED':
        return { bg: 'bg-gray-100 text-gray-700 border-gray-300', text: 'text-gray-700', dot: 'bg-gray-500', label: 'Not Answered' };
      case 'BUSY':
        return { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Busy' };
      case 'SWITCHED_OFF':
        return { bg: 'bg-stone-100 text-stone-700 border-stone-300', text: 'text-stone-700', dot: 'bg-stone-500', label: 'Switched Off' };
      case 'INTERESTED':
        return { bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Interested' };
      case 'NOT_INTERESTED':
        return { bg: 'bg-rose-50 text-rose-700 border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500', label: 'Not Interested' };
      case 'CALL_BACK_REQUESTED':
        return { bg: 'bg-purple-50 text-purple-700 border-purple-200', text: 'text-purple-700', dot: 'bg-purple-500', label: 'Call Back Requested' };
      case 'VISIT_SCHEDULED':
        return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', text: 'text-indigo-700', dot: 'bg-indigo-500', label: 'Visit Scheduled' };
      case 'CONVERTED':
        return { bg: 'bg-teal-50 text-teal-700 border-teal-200', text: 'text-teal-700', dot: 'bg-teal-500', label: 'Converted' };

      default:
        return { bg: 'bg-gray-50 text-gray-700 border-gray-200', text: 'text-gray-700', dot: 'bg-gray-400', label: val.replace(/_/g, ' ') };
    }
  };

  const style = getBadgeStyle(status);
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${style.bg} ${sizeClasses} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
};

export const CallOutcomeBadge: React.FC<{
  outcome: string;
  size?: 'sm' | 'md';
  className?: string;
}> = ({ outcome, size = 'md', className = '' }) => {
  return <StatusBadge status={outcome} size={size} className={className} />;
};

export const FollowUpBadge: React.FC<{
  classification?: 'TODAY' | 'UPCOMING' | 'OVERDUE' | 'COMPLETED' | 'CANCELLED' | string;
  status?: FollowUpStatus | string;
  size?: 'sm' | 'md';
  className?: string;
}> = ({ classification, status, size = 'sm', className = '' }) => {
  let badgeType = classification || status || 'PENDING';
  if (status === FollowUpStatus.COMPLETED) badgeType = 'COMPLETED';
  if (status === FollowUpStatus.CANCELLED) badgeType = 'CANCELLED';

  const getStyle = (type: string) => {
    switch (type.toUpperCase()) {
      case 'OVERDUE':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold',
          dot: 'bg-rose-500 animate-pulse',
          label: 'Overdue',
        };
      case 'TODAY':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200 font-semibold',
          dot: 'bg-amber-500',
          label: 'Today',
        };
      case 'UPCOMING':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
          label: 'Upcoming',
        };
      case 'COMPLETED':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          label: 'Completed',
        };
      case 'CANCELLED':
        return {
          bg: 'bg-slate-100 text-slate-600 border-slate-200',
          dot: 'bg-slate-400',
          label: 'Cancelled',
        };
      default:
        return {
          bg: 'bg-gray-100 text-gray-700 border-gray-200',
          dot: 'bg-gray-400',
          label: type,
        };
    }
  };

  const style = getStyle(badgeType);
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${style.bg} ${sizeClasses} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
};

