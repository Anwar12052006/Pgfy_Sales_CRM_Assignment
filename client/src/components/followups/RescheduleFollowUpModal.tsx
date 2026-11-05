import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui';
import { followUpService } from '@/services/followUpService';
import type { FollowUp } from '@/types';

interface RescheduleFollowUpModalProps {
  followUp: FollowUp | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: FollowUp) => void;
}

export const RescheduleFollowUpModal: React.FC<RescheduleFollowUpModalProps> = ({
  followUp,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [newDueDate, setNewDueDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && followUp) {
      setErrorMessage(null);
      setIsSubmitting(false);
      setNotes(followUp.notes || '');

      // Suggest tomorrow at 10:00 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      const y = tomorrow.getFullYear();
      const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const d = String(tomorrow.getDate()).padStart(2, '0');
      const h = String(tomorrow.getHours()).padStart(2, '0');
      const min = String(tomorrow.getMinutes()).padStart(2, '0');

      setNewDueDate(`${y}-${m}-${d}T${h}:${min}`);
    }
  }, [isOpen, followUp]);

  if (!isOpen || !followUp) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!newDueDate) {
      setErrorMessage('Please select a valid future date and time');
      return;
    }

    const selectedTime = new Date(newDueDate).getTime();
    if (isNaN(selectedTime) || selectedTime <= Date.now()) {
      setErrorMessage('Rescheduled date and time must be in the future');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await followUpService.reschedule(followUp.id, {
        dueAt: new Date(newDueDate).toISOString(),
        notes: notes.trim() || undefined,
      });

      onSuccess(updated);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to reschedule follow-up task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title="Reschedule Follow-Up"
      description="Update callback timing or appointment for this prospective tenant"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Lead / Customer Banner */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 text-sm">
              {followUp.lead?.customerName || 'Prospect'}
            </span>
            <span className="text-slate-500 font-mono">{followUp.lead?.mobileNumber || '—'}</span>
          </div>
          <div className="text-slate-500 flex items-center gap-1 pt-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Previously scheduled for:</span>
            <span className="font-medium text-slate-700">
              {new Date(followUp.dueAt).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })}
            </span>
          </div>
        </div>

        {/* New Date and Time Input */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
            New Follow-Up Date & Time <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="datetime-local"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Choose when you or the executive should connect next with this lead.
          </p>
        </div>

        {/* Updated Notes */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
            Updated Notes / Reason for Rescheduling
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="e.g., Prospect requested call back tomorrow morning after office hours..."
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Rescheduling...</span>
              </>
            ) : (
              <>
                <Calendar className="w-3.5 h-3.5" />
                <span>Confirm Reschedule</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
