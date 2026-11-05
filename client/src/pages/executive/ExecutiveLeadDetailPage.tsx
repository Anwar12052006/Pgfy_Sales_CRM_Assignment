import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Home,
  IndianRupee,
  Layers,
  Calendar,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import {
  StatusBadge,
  LoadingSpinner,
  ErrorState,
} from '@/components/common';
import { Modal } from '@/components/ui';
import { RecordCallModal } from '@/components/calls/RecordCallModal';
import { CallActivityTimeline } from '@/components/calls/CallActivityTimeline';
import { leadService } from '@/services/leadService';
import { callService } from '@/services/callService';
import type { LeadDetail, Call, Lead } from '@/types';
import { LeadStatus } from '@/types';

export const ExecutiveLeadDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);

  // Modals state
  const [isRecordCallOpen, setIsRecordCallOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<LeadStatus>(LeadStatus.CONTACTED);
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

  // Toast notification
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchLeadDetails = useCallback(
    async (showRefresh = false) => {
      if (!id) {
        setError({ status: 400, message: 'Invalid lead ID parameter' });
        setIsLoading(false);
        return;
      }

      if (showRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      try {
        const leadData = (await leadService.getLeadById(id)) as LeadDetail;
        setLead(leadData);
        setNewStatus(leadData.status);

        // Fetch complete call timeline
        try {
          const callsData = await callService.getCallsByLead(id);
          setCalls(Array.isArray(callsData) ? callsData : leadData.calls || []);
        } catch {
          // If fetching separate calls fails, fall back to calls included in lead response
          setCalls(leadData.calls || []);
        }
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
        const status = axiosErr.response?.status;
        const msg =
          axiosErr.response?.data?.message ||
          (err instanceof Error ? err.message : 'Failed to retrieve lead details');

        setError({
          status,
          message: msg,
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [id]
  );

  useEffect(() => {
    fetchLeadDetails();
  }, [fetchLeadDetails]);

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    setIsSubmittingStatus(true);
    try {
      const updated = await leadService.updateLeadStatus(lead.id, newStatus);
      setLead((prev) => (prev ? { ...prev, status: updated.status } : null));
      setIsStatusModalOpen(false);
      setNotification({
        type: 'success',
        message: `Lead status updated to ${newStatus.replace(/_/g, ' ')}`,
      });
      fetchLeadDetails(true);
    } catch (err: unknown) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to update lead status',
      });
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  const handleCallSuccess = () => {
    setNotification({
      type: 'success',
      message: 'Call recorded successfully and activity timeline updated.',
    });
    fetchLeadDetails(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8">
        <LoadingSpinner size={36} />
        <p className="mt-4 text-sm font-medium text-slate-500">Loading customer profile & activity...</p>
      </div>
    );
  }

  // Error state (403 IDOR / 404 / 500)
  if (error || !lead) {
    const isForbidden = error?.status === 403;
    const isNotFound = error?.status === 404;

    return (
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6">
        <div className="mb-6">
          <Link
            to="/executive/leads"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Assigned Leads
          </Link>
        </div>

        {isForbidden ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-8 text-center shadow-xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-4">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Access Restricted</h3>
            <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
              You do not have permission to view this customer. This lead is assigned to another sales executive or remains unassigned.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/executive/leads')}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition"
              >
                <ArrowLeft className="h-4 w-4" />
                Return to My Leads
              </button>
            </div>
          </div>
        ) : (
          <ErrorState
            title={isNotFound ? 'Customer Not Found' : 'Unable to Load Customer Details'}
            message={
              isNotFound
                ? 'The lead record you requested does not exist or has been removed.'
                : error?.message || 'An unexpected error occurred while loading this customer record.'
            }
            onRetry={isNotFound ? undefined : () => fetchLeadDetails()}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl shadow-lg border text-sm transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Navigation & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/executive/leads')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            title="Return to Assigned Leads"
          >
            <ArrowLeft className="h-4 w-4 text-slate-500" />
            <span>Back to Leads</span>
          </button>
          <span className="text-xs text-slate-400">/</span>
          <span className="text-xs font-medium text-slate-500 truncate max-w-[200px]">
            {lead.customerName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchLeadDetails(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsStatusModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition shadow-2xs"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Update Stage</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRecordCallOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition shadow-xs"
          >
            <Phone className="h-3.5 w-3.5" />
            <span>Log Sales Call</span>
          </button>
        </div>
      </div>

      {/* Customer Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">{lead.customerName}</h1>
              <StatusBadge status={lead.status} size="md" />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Lead ID: <span className="font-mono text-slate-700">{lead.id}</span> • Registered on{' '}
              {new Date(lead.enquiryDate).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={`tel:${lead.mobileNumber}`}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
            >
              <Phone className="h-3.5 w-3.5 text-emerald-400" />
              <span>Call {lead.mobileNumber}</span>
            </a>
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <Mail className="h-3.5 w-3.5 text-slate-500" />
                <span>Email Customer</span>
              </a>
            )}
          </div>
        </div>

        {/* Quick Highlights Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
              <Home className="h-4 w-4 text-slate-400" />
              <span>Property Type</span>
            </div>
            <p className="text-sm font-semibold text-slate-900">{lead.propertyCategory}</p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
              <MapPin className="h-4 w-4 text-slate-400" />
              <span>Target Location</span>
            </div>
            <p className="text-sm font-semibold text-slate-900 truncate" title={lead.preferredLocation}>
              {lead.preferredLocation}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
              <IndianRupee className="h-4 w-4 text-slate-400" />
              <span>Monthly Budget</span>
            </div>
            <p className="text-sm font-bold text-slate-900">
              ₹{Number(lead.budget).toLocaleString('en-IN')}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
              <FileText className="h-4 w-4 text-slate-400" />
              <span>Lead Source</span>
            </div>
            <p className="text-sm font-semibold text-slate-900">{lead.leadSource}</p>
          </div>
        </div>
      </div>

      {/* Main 2-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Contact & Lead Specifications */}
        <div className="space-y-6 lg:col-span-1">
          {/* Customer Profile Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
              Prospect Information
            </h3>
            <dl className="space-y-3.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <dt className="text-slate-500 font-medium">Full Name</dt>
                <dd className="text-slate-900 font-semibold text-right">{lead.customerName}</dd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <dt className="text-slate-500 font-medium">Mobile Number</dt>
                <dd className="font-mono text-slate-900 font-semibold text-right">{lead.mobileNumber}</dd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <dt className="text-slate-500 font-medium">Email Address</dt>
                <dd className="text-slate-900 font-medium text-right truncate max-w-[170px]">
                  {lead.email || '—'}
                </dd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <dt className="text-slate-500 font-medium">Lead Stage</dt>
                <dd className="text-right">
                  <StatusBadge status={lead.status} size="sm" />
                </dd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <dt className="text-slate-500 font-medium">Assigned Executive</dt>
                <dd className="text-slate-900 font-semibold text-right">
                  {lead.assignedExecutive ? lead.assignedExecutive.name : 'Unassigned'}
                </dd>
              </div>
              <div className="flex justify-between py-1">
                <dt className="text-slate-500 font-medium">Created On</dt>
                <dd className="text-slate-600 text-right">
                  {new Date(lead.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </dd>
              </div>
            </dl>
          </div>

          {/* Pending Follow-ups Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Follow-up Reminders
              </h3>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {lead.followUps?.length || 0} Scheduled
              </span>
            </div>

            {(!lead.followUps || lead.followUps.length === 0) ? (
              <p className="text-xs text-slate-500 text-center py-4">
                No active follow-up tasks scheduled for this lead.
              </p>
            ) : (
              <div className="space-y-3">
                {lead.followUps.map((fu) => (
                  <div
                    key={fu.id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-blue-500" />
                        {new Date(fu.dueAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                        {fu.status}
                      </span>
                    </div>
                    {fu.notes && <p className="text-slate-600 line-clamp-2">{fu.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Complete Call Activity Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Call Interaction History</h3>
                <p className="text-xs text-slate-500">
                  Comprehensive audit trail of phone calls logged with this customer.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRecordCallOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              >
                <Phone className="h-3.5 w-3.5 text-emerald-600" />
                <span>Log Call</span>
              </button>
            </div>

            <CallActivityTimeline
              calls={calls}
              onRecordCall={() => setIsRecordCallOpen(true)}
              emptyMessage="No calls recorded yet. Click 'Log Sales Call' above to register your first interaction."
            />
          </div>
        </div>
      </div>

      {/* Stage Update Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Update Lead Stage"
      >
        <form onSubmit={handleStatusSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Current Pipeline Stage
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as LeadStatus)}
              className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {Object.values(LeadStatus).map((st) => (
                <option key={st} value={st}>
                  {st.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-700">
            Updating the status will immediately reflect in your performance telemetry and team conversion metrics.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsStatusModalOpen(false)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingStatus}
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isSubmittingStatus ? 'Updating...' : 'Save Stage'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Call Modal */}
      <RecordCallModal
        isOpen={isRecordCallOpen}
        onClose={() => setIsRecordCallOpen(false)}
        preselectedLead={lead as unknown as Lead}
        onSuccess={handleCallSuccess}
      />
    </div>
  );
};

export default ExecutiveLeadDetailPage;
