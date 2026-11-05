import React from 'react';
import { Phone, Clock, Calendar, User, MessageSquare } from 'lucide-react';
import type { Call } from '../../types';
import { CallOutcomeBadge } from '../common/StatusBadge';

interface CallActivityTimelineProps {
  calls: Call[];
  isLoading?: boolean;
  onRecordCall?: () => void;
  onSelectCall?: (call: Call) => void;
  emptyMessage?: string;
}

export const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
};

export const formatDateTime = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
};

export const CallActivityTimeline: React.FC<CallActivityTimelineProps> = ({
  calls,
  isLoading = false,
  onRecordCall,
  onSelectCall,
  emptyMessage = 'No call activities recorded yet.',
}) => {
  const safeCalls = Array.isArray(calls)
    ? calls
    : (calls && typeof calls === 'object' && 'calls' in (calls as object) && Array.isArray((calls as { calls: Call[] }).calls))
    ? (calls as { calls: Call[] }).calls
    : [];

  if (isLoading) {
    return (
      <div className="py-8 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Loading call history...</p>
      </div>
    );
  }

  if (safeCalls.length === 0) {
    return (
      <div className="py-10 px-4 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
        <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-3">
          <Phone className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-800 mb-1">No Call Activity</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">{emptyMessage}</p>
        {onRecordCall && (
          <button
            onClick={onRecordCall}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
          >
            <Phone className="w-3.5 h-3.5" />
            Log First Call
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
      {safeCalls.map((call) => {
        const nextFollowUp = call.followUps && call.followUps.length > 0 ? call.followUps[0] : null;

        return (
          <div key={call.id} className="relative group">
            {/* Timeline dot */}
            <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            </div>

            {/* Activity Card */}
            <div
              onClick={() => onSelectCall && onSelectCall(call)}
              className={`p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md transition-all ${
                onSelectCall ? 'cursor-pointer' : ''
              }`}
            >
              {/* Header: Outcome Badge + Call Date & Duration */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <CallOutcomeBadge outcome={call.outcome} />
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {formatDuration(call.durationSeconds)}
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {formatDateTime(call.callDateTime)}
                </div>
              </div>

              {/* Executive Caller */}
              {call.executive && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Logged by:</span>
                  <span className="font-medium text-slate-700">{call.executive.name}</span>
                </div>
              )}

              {/* Call Notes */}
              {call.notes ? (
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed flex items-start gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span>{call.notes}</span>
                </div>
              ) : (
                <p className="text-xs italic text-slate-400">No discussion notes recorded.</p>
              )}

              {/* Next follow-up tag if present */}
              {nextFollowUp && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md font-medium border border-amber-200">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    <span>Follow-up scheduled: {formatDateTime(nextFollowUp.dueAt)}</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wide font-semibold text-amber-600">
                    {nextFollowUp.status}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
