import React from 'react';
import { X, Phone, Clock, Calendar, Mail, MapPin } from 'lucide-react';
import type { Call } from '../../types';
import { CallOutcomeBadge, StatusBadge } from '../common/StatusBadge';
import { formatDuration, formatDateTime } from './CallActivityTimeline';

interface CallDetailModalProps {
  call: Call | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CallDetailModal: React.FC<CallDetailModalProps> = ({ call, isOpen, onClose }) => {
  if (!isOpen || !call) return null;

  const nextFollowUp = call.followUps && call.followUps.length > 0 ? call.followUps[0] : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl transition-all border border-slate-100 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/60">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Call Record Details</h3>
                <p className="text-xs text-slate-500">ID: {call.id.slice(0, 8)}...</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Call Outcome & Key Metrics Banner */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                  Call Outcome
                </div>
                <CallOutcomeBadge outcome={call.outcome} />
              </div>

              <div className="flex items-center gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                    Duration
                  </div>
                  <div className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
                    <Clock className="w-4 h-4 text-blue-600" />
                    {formatDuration(call.durationSeconds)}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                    Date & Time
                  </div>
                  <div className="inline-flex items-center gap-1 text-xs font-medium text-slate-700">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    {formatDateTime(call.callDateTime)}
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Details */}
            {call.lead && (
              <div className="p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Customer Information
                  </span>
                  {call.lead.status && <StatusBadge status={call.lead.status} size="sm" />}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Customer Name</span>
                    <span className="font-semibold text-slate-800 text-sm">{call.lead.customerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Mobile Number</span>
                    <a
                      href={`tel:${call.lead.mobileNumber}`}
                      className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      {call.lead.mobileNumber}
                    </a>
                  </div>
                  {call.lead.email && (
                    <div>
                      <span className="text-slate-400 block mb-0.5">Email</span>
                      <span className="text-slate-700 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {call.lead.email}
                      </span>
                    </div>
                  )}
                  {call.lead.preferredLocation && (
                    <div>
                      <span className="text-slate-400 block mb-0.5">Preferred Location</span>
                      <span className="text-slate-700 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {call.lead.preferredLocation}
                      </span>
                    </div>
                  )}
                  {call.lead.budget !== undefined && call.lead.budget !== null && (
                    <div>
                      <span className="text-slate-400 block mb-0.5">Budget</span>
                      <span className="font-medium text-slate-700">₹{call.lead.budget.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Executive Information */}
            {call.executive && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    {call.executive.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Logged by Executive</span>
                    <span className="font-semibold text-slate-800">{call.executive.name}</span>
                  </div>
                </div>
                <span className="text-slate-400">{call.executive.email}</span>
              </div>
            )}

            {/* Call Notes */}
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Discussion Notes
              </span>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed min-h-[60px]">
                {call.notes || <span className="italic text-slate-400">No notes provided for this call.</span>}
              </div>
            </div>

            {/* Next Follow-up Schedule */}
            {nextFollowUp && (
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    Scheduled Next Follow-up
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200/60 text-amber-800 px-2 py-0.5 rounded">
                    {nextFollowUp.status}
                  </span>
                </div>
                <div className="text-xs text-amber-900 font-medium ml-5.5">
                  Due: {formatDateTime(nextFollowUp.dueAt)}
                </div>
                {nextFollowUp.notes && (
                  <p className="text-xs text-amber-800/80 mt-1 ml-5.5">{nextFollowUp.notes}</p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end border-t border-slate-100 px-6 py-3.5 bg-slate-50/50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
