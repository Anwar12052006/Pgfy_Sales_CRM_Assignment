import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Filter,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
  Layers,
  Phone,
  Eye,
} from 'lucide-react';
import {
  PageHeader,
  SearchInput,
  FilterDropdown,
  DataTable,
  StatusBadge,
} from '@/components/common';
import { Modal } from '@/components/ui';
import { RecordCallModal } from '@/components/calls/RecordCallModal';
import { LeadDetailDrawer } from '@/components/leads/LeadDetailDrawer';
import { leadService } from '@/services/leadService';
import type { Lead, Column, PaginationMetadata } from '@/types';
import { LeadStatus } from '@/types';

export const ExecutiveLeadsPage: React.FC = () => {
  const navigate = useNavigate();

  // Leads & Pagination State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Search & Filter State
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Status Update Modal State
  const [updatingLead, setUpdatingLead] = useState<Lead | null>(null);
  const [newStatus, setNewStatus] = useState<LeadStatus>(LeadStatus.CONTACTED);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Drawer and Call Modal State
  const [selectedLeadForDrawer, setSelectedLeadForDrawer] = useState<Lead | null>(null);
  const [selectedLeadForCall, setSelectedLeadForCall] = useState<Lead | null>(null);

  // Toast Notifications
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

  // Fetch leads for authenticated executive
  const fetchMyLeads = useCallback(
    async (pageToLoad = 1, showRefresh = false) => {
      if (showRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const res = await leadService.getLeads({
          page: pageToLoad,
          limit: pagination.limit,
          search: search.trim() || undefined,
          status: statusFilter || undefined,
        });

        setLeads(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } catch (err: unknown) {
        setNotification({
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to fetch assigned leads',
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [pagination.limit, search, statusFilter]
  );

  useEffect(() => {
    fetchMyLeads(1);
  }, [fetchMyLeads]);

  // Open Status Update Modal
  const handleOpenStatusModal = (lead: Lead) => {
    setUpdatingLead(lead);
    setNewStatus(lead.status);
  };

  // Submit Status Update
  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingLead) return;

    setIsSubmitting(true);
    try {
      await leadService.updateLeadStatus(updatingLead.id, newStatus);

      setUpdatingLead(null);
      setNotification({
        type: 'success',
        message: `Status for ${updatingLead.customerName} updated to ${newStatus.replace(/_/g, ' ')}!`,
      });
      fetchMyLeads(pagination.page);
    } catch (err: unknown) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to update status',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenRecordCall = (lead: Lead) => {
    setSelectedLeadForCall(lead);
  };

  const handleCallSuccess = () => {
    setNotification({
      type: 'success',
      message: 'Call recorded successfully and activity timeline updated.',
    });
    fetchMyLeads(pagination.page);
  };

  // Data Table Columns (Strictly no assignment controls or general editing)
  const columns: Column<Lead>[] = [
    {
      header: 'Customer Details',
      accessorKey: 'customerName',
      render: (lead) => (
        <div>
          <span className="font-semibold text-gray-900 block">{lead.customerName}</span>
          <span className="text-xs text-gray-500 font-mono">{lead.mobileNumber}</span>
        </div>
      ),
    },
    {
      header: 'Email',
      accessorKey: 'email',
      render: (lead) => (
        <span className="text-xs text-gray-600 truncate max-w-[140px] block">
          {lead.email || '—'}
        </span>
      ),
    },
    {
      header: 'Property Category',
      accessorKey: 'propertyCategory',
      render: (lead) => (
        <span className="text-xs font-medium text-gray-800">
          {lead.propertyCategory}
        </span>
      ),
    },
    {
      header: 'Preferred Location',
      accessorKey: 'preferredLocation',
      render: (lead) => (
        <span className="text-xs text-gray-600 truncate max-w-[140px] block">
          {lead.preferredLocation}
        </span>
      ),
    },
    {
      header: 'Budget (INR)',
      accessorKey: 'budget',
      render: (lead) => (
        <span className="text-sm font-semibold text-gray-900">
          ₹{Number(lead.budget).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Lead Source',
      accessorKey: 'leadSource',
      render: (lead) => (
        <span className="text-xs text-gray-500">{lead.leadSource}</span>
      ),
    },
    {
      header: 'Lead Status',
      accessorKey: 'status',
      render: (lead) => <StatusBadge status={lead.status} size="sm" />,
    },
    {
      header: 'Enquiry Date',
      accessorKey: 'enquiryDate',
      render: (lead) => (
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {new Date(lead.enquiryDate).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (lead) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => handleOpenRecordCall(lead)}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors shadow-2xs"
            title="Log Call with Lead"
          >
            <Phone className="h-3 w-3" />
            <span>Call</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/executive/leads/${lead.id}`)}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs"
            title="View Details & Call History"
          >
            <Eye className="h-3 w-3 text-gray-500" />
            <span>Details</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenStatusModal(lead)}
            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors shadow-2xs"
            title="Update Lead Status"
          >
            <Layers className="h-3 w-3" />
            <span>Stage</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`flex items-center justify-between rounded-xl border p-4 text-xs font-semibold shadow-xs transition-all ${
            notification.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
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
            type="button"
            onClick={() => setNotification(null)}
            className="rounded p-1 hover:bg-black/5"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="My Assigned Leads"
        description="Prospective student & professional tenant enquiries assigned to your active sales queue"
        breadcrumbs={[
          { label: 'Executive', href: '/executive/dashboard' },
          { label: 'My Leads' },
        ]}
        actions={
          <button
            type="button"
            onClick={() => fetchMyLeads(pagination.page, true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 focus:outline-none transition-colors"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-gray-500 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`}
            />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        }
      />

      {/* Filters Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search my leads by name or phone..."
            className="w-full sm:max-w-xs"
          />

          <FilterDropdown
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={Object.values(LeadStatus).map((st) => ({
              label: st.replace(/_/g, ' '),
              value: st,
            }))}
            allOptionLabel="All Statuses"
            icon={Filter}
          />
        </div>

        <div className="text-xs font-medium text-gray-500">
          Showing <span className="font-bold text-gray-900">{leads.length}</span> of{' '}
          <span className="font-bold text-gray-900">{pagination.total}</span> assigned leads
        </div>
      </div>

      {/* Leads Data Table */}
      <DataTable
        columns={columns}
        data={leads}
        keyExtractor={(lead) => lead.id}
        isLoading={isLoading}
        emptyTitle="No leads in your queue"
        emptyDescription="When prospective tenant leads are assigned to you by the admin, they will appear here."
        pagination={{
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total,
          totalPages: pagination.totalPages,
          onPageChange: (newPage) => fetchMyLeads(newPage),
        }}
      />

      {/* ── UPDATE STATUS MODAL ─────────────────────────────────────── */}
      <Modal
        isOpen={Boolean(updatingLead)}
        onClose={() => setUpdatingLead(null)}
        title={`Update Lead Stage: ${updatingLead?.customerName || ''}`}
        description="Advance the customer enquiry through the property consultation pipeline"
        maxWidth="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setUpdatingLead(null)}
              disabled={isSubmitting}
              className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStatusSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Save Status</span>
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600 space-y-1">
            <div>
              <span className="font-semibold text-gray-700">Customer:</span>{' '}
              {updatingLead?.customerName} ({updatingLead?.mobileNumber})
            </div>
            <div>
              <span className="font-semibold text-gray-700">Looking for:</span>{' '}
              {updatingLead?.propertyCategory} in {updatingLead?.preferredLocation}
            </div>
            <div>
              <span className="font-semibold text-gray-700">Budget:</span> ₹
              {Number(updatingLead?.budget).toLocaleString('en-IN')}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
              Select New Status <span className="text-rose-500">*</span>
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as LeadStatus)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {Object.values(LeadStatus).map((st) => (
                <option key={st} value={st}>
                  {st.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-xs text-blue-700">
            Updating the status will immediately reflect in your performance telemetry and team conversion metrics.
          </div>
        </div>
      </Modal>

      {/* Lead Detail & Call History Drawer */}
      <LeadDetailDrawer
        lead={selectedLeadForDrawer}
        isOpen={Boolean(selectedLeadForDrawer)}
        onClose={() => setSelectedLeadForDrawer(null)}
        onLeadUpdated={() => fetchMyLeads(pagination.page)}
        onOpenStatusModal={(lead) => handleOpenStatusModal(lead)}
      />

      {/* Record Call Modal (for dedicated call button) */}
      <RecordCallModal
        isOpen={Boolean(selectedLeadForCall)}
        onClose={() => setSelectedLeadForCall(null)}
        preselectedLead={selectedLeadForCall}
        onSuccess={handleCallSuccess}
      />
    </div>
  );
};

export default ExecutiveLeadsPage;
