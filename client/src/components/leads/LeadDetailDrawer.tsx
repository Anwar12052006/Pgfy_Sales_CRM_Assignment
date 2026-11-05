import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Phone,
  Mail,
  Layers,
  History,
  RefreshCw,
} from 'lucide-react';
import type { Lead, Call, DrawerLead } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { CallActivityTimeline } from '../calls/CallActivityTimeline';
import { RecordCallModal } from '../calls/RecordCallModal';
import { CallDetailModal } from '../calls/CallDetailModal';
import { callService } from '../../services/callService';

interface LeadDetailDrawerProps {
  lead: DrawerLead | null;
  isOpen: boolean;
  onClose: () => void;
  onLeadUpdated?: () => void;
  onOpenStatusModal?: (lead: Lead) => void;
}

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({
  lead,
  isOpen,
  onClose,
  onLeadUpdated,
  onOpenStatusModal,
}) => {
  const [calls, setCalls] = useState<Call[]>([]);
  const [isLoadingCalls, setIsLoadingCalls] = useState(false);
  const [isRecordCallOpen, setIsRecordCallOpen] = useState(false);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);

  const fetchCalls = useCallback(async () => {
    if (!lead) return;
    setIsLoadingCalls(true);
    try {
      const res = await callService.getCallsByLead(lead.id);
      setCalls(res || []);
    } catch (err) {
      console.error('Failed to fetch lead calls:', err);
    } finally {
      setIsLoadingCalls(false);
    }
  }, [lead]);

  useEffect(() => {
    if (isOpen && lead) {
      fetchCalls();
    } else {
      setCalls([]);
    }
  }, [isOpen, lead, fetchCalls]);

  if (!isOpen || !lead) return null;

  const handleCallRecorded = () => {
    fetchCalls();
    if (onLeadUpdated) onLeadUpdated();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <h2 className="text-xl font-bold text-slate-900">{lead.customerName}</h2>
                  {lead.status && <StatusBadge status={lead.status} size="sm" />}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <a
                    href={`tel:${lead.mobileNumber}`}
                    className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {lead.mobileNumber}
                  </a>
                  {lead.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {lead.email}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Action Bar */}
            <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsRecordCallOpen(true)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition active:scale-[0.98]"
              >
                <Phone className="w-4 h-4" />
                <span>Log New Call</span>
              </button>

              {onOpenStatusModal && (
                <button
                  type="button"
                  onClick={() => onOpenStatusModal(lead as Lead)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  <Layers className="w-4 h-4 text-slate-500" />
                  <span>Update Stage</span>
                </button>
              )}

              <button
                type="button"
                onClick={fetchCalls}
                title="Refresh call timeline"
                disabled={isLoadingCalls}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingCalls ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Customer Information Cards */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Requirement Details
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-100 shadow-2xs">
                    <span className="text-slate-400 block mb-0.5">Looking For</span>
                    <span className="font-semibold text-slate-800">{lead.propertyCategory || '—'}</span>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-slate-100 shadow-2xs">
                    <span className="text-slate-400 block mb-0.5">Budget</span>
                    <span className="font-semibold text-slate-800">
                      {lead.budget !== undefined && lead.budget !== null
                        ? `₹${Number(lead.budget).toLocaleString('en-IN')}`
                        : '—'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-slate-100 shadow-2xs">
                    <span className="text-slate-400 block mb-0.5">Preferred Location</span>
                    <span className="font-semibold text-slate-800 truncate block">
                      {lead.preferredLocation || '—'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-slate-100 shadow-2xs">
                    <span className="text-slate-400 block mb-0.5">Lead Source</span>
                    <span className="font-semibold text-slate-800">{lead.leadSource || 'Direct'}</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                  <span>Enquiry Date:</span>
                  <span className="font-medium text-slate-700">
                    {lead.enquiryDate
                      ? new Date(lead.enquiryDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </span>
                </div>
              </div>

              {/* Call History & Activity Timeline */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-slate-600" />
                    <h3 className="text-sm font-semibold text-slate-900">Call History & Activity</h3>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">
                      {calls.length}
                    </span>
                  </div>
                </div>

                <CallActivityTimeline
                  calls={calls}
                  isLoading={isLoadingCalls}
                  onRecordCall={() => setIsRecordCallOpen(true)}
                  onSelectCall={(c) => setSelectedCall(c)}
                  emptyMessage={`No calls have been recorded yet for ${lead.customerName}. Click below to log your first call.`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Record Call Modal (Pre-locked to this lead) */}
      <RecordCallModal
        isOpen={isRecordCallOpen}
        onClose={() => setIsRecordCallOpen(false)}
        preselectedLead={lead}
        onSuccess={handleCallRecorded}
      />

      {/* Call Detail Modal */}
      <CallDetailModal
        call={selectedCall}
        isOpen={Boolean(selectedCall)}
        onClose={() => setSelectedCall(null)}
      />
    </>
  );
};
