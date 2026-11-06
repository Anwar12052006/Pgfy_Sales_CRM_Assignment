import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  PhoneCall,
  AlertCircle,
  Loader2,
  UserCheck,
} from 'lucide-react';
import { Modal } from '@/components/ui';
import { CallOutcome, type Call, type Lead, type DrawerLead } from '@/types';
import { callService } from '@/services/callService';
import { leadService } from '@/services/leadService';

export interface RecordCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCall?: Call) => void;
  /** If provided, lead is locked to this lead. Otherwise, executive can select an assigned lead. */
  lead?: DrawerLead | null;
  preselectedLead?: DrawerLead | null;
}

const OUTCOME_OPTIONS = [
  { value: CallOutcome.CONNECTED, label: 'Connected', desc: 'Call answered, spoke with prospect' },
  { value: CallOutcome.INTERESTED, label: 'Interested', desc: 'Prospect expressed positive interest' },
  { value: CallOutcome.CALL_BACK_REQUESTED, label: 'Call Back Requested', desc: 'Prospect asked to call at a later time' },
  { value: CallOutcome.VISIT_SCHEDULED, label: 'Visit Scheduled', desc: 'Confirmed property walkthrough date' },
  { value: CallOutcome.CONVERTED, label: 'Converted', desc: 'Advance payment or booking confirmed' },
  { value: CallOutcome.NOT_ANSWERED, label: 'Not Answered', desc: 'Ringing but no answer' },
  { value: CallOutcome.BUSY, label: 'Busy', desc: 'Line busy / engaged' },
  { value: CallOutcome.SWITCHED_OFF, label: 'Switched Off', desc: 'Mobile switched off or out of coverage' },
  { value: CallOutcome.NOT_INTERESTED, label: 'Not Interested', desc: 'Prospect declined services' },
];

function getCurrentLocalDateTime(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export const RecordCallModal: React.FC<RecordCallModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  lead = null,
  preselectedLead = null,
}) => {
  // Form fields
  const [selectedLeadId, setSelectedLeadId] = useState<string>(lead?.id || '');
  const [callDateTime, setCallDateTime] = useState<string>(getCurrentLocalDateTime());
  const [durationMinutes, setDurationMinutes] = useState<number>(0);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [outcome, setOutcome] = useState<CallOutcome>(CallOutcome.CONNECTED);
  const [notes, setNotes] = useState<string>('');

  // Optional Follow-up fields
  const [scheduleFollowUp, setScheduleFollowUp] = useState<boolean>(false);
  const [followUpDate, setFollowUpDate] = useState<string>('');
  const [followUpNotes, setFollowUpNotes] = useState<string>('');

  // Assigned leads dropdown state (when lead is not preset)
  const [assignedLeads, setAssignedLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState<boolean>(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize or reset form on open
  useEffect(() => {
    if (isOpen) {
      setCallDateTime(getCurrentLocalDateTime());
      setDurationMinutes(0);
      setDurationSeconds(0);
      setOutcome(CallOutcome.CONNECTED);
      setNotes('');
      setScheduleFollowUp(false);
      setFollowUpDate('');
      setFollowUpNotes('');
      setErrorMessage(null);
      setIsSubmitting(false);

      const effectiveLead = lead || preselectedLead;
      if (effectiveLead) {
        setSelectedLeadId(effectiveLead.id);
      } else {
        setSelectedLeadId('');
      }

      // Fetch assigned leads so executive can select or see all eligible assigned prospects
      setLoadingLeads(true);
      leadService
        .getLeads({ limit: 100 })
        .then((res) => {
          const fetchedLeads = res.data || [];
          let combined = [...fetchedLeads];

          // If a preselected lead was provided but isn't in the fetched list, include it
          if (effectiveLead && !combined.some((l) => l.id === effectiveLead.id)) {
            combined = [effectiveLead as Lead, ...combined];
          }

          setAssignedLeads(combined);

          if (effectiveLead) {
            setSelectedLeadId(effectiveLead.id);
          } else if (combined.length > 0 && combined[0]) {
            setSelectedLeadId(combined[0].id);
          } else {
            setSelectedLeadId('');
          }
        })
        .catch(() => {
          setErrorMessage('Could not load assigned leads for call recording');
        })
        .finally(() => setLoadingLeads(false));
    }
  }, [isOpen, lead, preselectedLead]);

  const effectiveLead = lead || preselectedLead;
  const activeSelectedLead =
    assignedLeads.find((l) => l.id === selectedLeadId) ||
    (effectiveLead?.id === selectedLeadId ? effectiveLead : null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const targetLeadId = selectedLeadId || effectiveLead?.id;
    if (!targetLeadId) {
      setErrorMessage('Please select a lead to log the call for.');
      return;
    }

    const totalDuration = Math.max(0, Number(durationMinutes || 0) * 60 + Number(durationSeconds || 0));

    if (scheduleFollowUp && !followUpDate) {
      setErrorMessage('Please select a date and time for the scheduled follow-up.');
      return;
    }

    setIsSubmitting(true);

    try {
      const createdCall = await callService.recordCall({
        leadId: targetLeadId,
        callDateTime: callDateTime ? new Date(callDateTime).toISOString() : new Date().toISOString(),
        durationSeconds: totalDuration,
        outcome,
        notes: notes.trim() || undefined,
        nextFollowUpDate: scheduleFollowUp && followUpDate ? new Date(followUpDate).toISOString() : undefined,
        nextFollowUpNotes: scheduleFollowUp && followUpNotes.trim() ? followUpNotes.trim() : undefined,
      });

      onSuccess(createdCall);
      onClose();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const resData = err.response?.data as { message?: string; errors?: Array<{ field?: string; message: string }> } | undefined;
        if (resData?.errors && resData.errors.length > 0) {
          const detail = resData.errors.map((e) => e.message || e.field).join(', ');
          setErrorMessage(detail || resData.message || 'Validation error occurred.');
        } else if (resData?.message) {
          setErrorMessage(resData.message);
        } else {
          setErrorMessage(err.message || 'Failed to record call');
        }
      } else {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to record call');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title="Record Sales Call"
      description="Log outbound or inbound prospect interaction, duration, and outcomes"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ── 1. Target Lead Selector ─────────────────────── */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Prospect / Tenant Lead <span className="text-rose-500">*</span>
          </label>
          <select
            value={selectedLeadId}
            onChange={(e) => setSelectedLeadId(e.target.value)}
            disabled={loadingLeads || isSubmitting}
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          >
            {loadingLeads ? (
              <option value="">Loading assigned leads...</option>
            ) : assignedLeads.length === 0 ? (
              <option value="">No assigned leads available</option>
            ) : (
              assignedLeads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.customerName} - {l.mobileNumber}{l.preferredLocation ? ` (${l.preferredLocation})` : ''}
                </option>
              ))
            )}
          </select>

          {/* Active selection summary banner */}
          {activeSelectedLead && (
            <div className="mt-2 flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50/70 p-2.5 text-xs">
              <div>
                <p className="font-semibold text-gray-900">{activeSelectedLead.customerName}</p>
                <p className="text-[11px] text-gray-500">
                  {activeSelectedLead.mobileNumber} • {activeSelectedLead.preferredLocation} ({activeSelectedLead.propertyCategory})
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100/70 px-2 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200">
                <UserCheck className="h-3 w-3" />
                Active Lead
              </span>
            </div>
          )}
        </div>

        {/* ── 2. Call Date/Time & Duration Inputs ─────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Call Timestamp <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                value={callDateTime}
                onChange={(e) => setCallDateTime(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Call Duration <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="360"
                  placeholder="Minutes"
                  value={durationMinutes || ''}
                  onChange={(e) => setDurationMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-2 text-xs text-gray-400 pointer-events-none">m</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="Seconds"
                  value={durationSeconds || ''}
                  onChange={(e) => setDurationSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-2 text-xs text-gray-400 pointer-events-none">s</span>
              </div>
            </div>
            <p className="mt-1 text-[11px] text-gray-400">
              Total duration: {durationMinutes * 60 + durationSeconds} seconds
            </p>
          </div>
        </div>

        {/* ── 3. Call Outcome Dropdown ────────────────────────────── */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Call Outcome <span className="text-rose-500">*</span>
          </label>
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as CallOutcome)}
            disabled={isSubmitting}
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            required
          >
            {OUTCOME_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} — {opt.desc}
              </option>
            ))}
          </select>
        </div>

        {/* ── 4. Discussion & Interaction Notes ───────────────────── */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Call Discussion Notes
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isSubmitting}
            placeholder="Record customer preferences, objections, budget flexibility, or property requirements..."
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 shadow-xs placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            maxLength={2000}
          />
          <p className="mt-1 text-right text-[11px] text-gray-400">{notes.length}/2000 characters</p>
        </div>

        {/* ── 5. Schedule Next Follow-Up Checkbox ──────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 space-y-3">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={scheduleFollowUp}
              onChange={(e) => setScheduleFollowUp(e.target.checked)}
              disabled={isSubmitting}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs font-semibold text-gray-800">
              Schedule Next Follow-Up Task
            </span>
          </label>

          {scheduleFollowUp && (
            <div className="space-y-3 pt-2 border-t border-gray-200">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Follow-Up Date & Time <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required={scheduleFollowUp}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Follow-Up Agenda / Task Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Call back after office hours, send lease draft, or confirm visit"
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  maxLength={500}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── 6. Action Buttons ────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 focus:outline-none transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 focus:outline-none transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Recording Call...</span>
              </>
            ) : (
              <>
                <PhoneCall className="h-3.5 w-3.5" />
                <span>Save Call Record</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
