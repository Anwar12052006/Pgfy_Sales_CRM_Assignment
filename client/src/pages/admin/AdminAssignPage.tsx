import React, { useState, useEffect, useCallback } from 'react';
import {
  UserCheck,
  UserX,
  Filter,
  AlertCircle,
  History,
  CheckCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import {
  PageHeader,
  SearchInput,
  FilterDropdown,
  DataTable,
  StatusBadge,
} from '@/components/common';
import { Modal } from '@/components/ui';
import { leadService, type AssignmentHistoryItem } from '@/services/leadService';
import type { Lead, Column, User, PaginationMetadata } from '@/types';

export const AdminAssignPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [assignmentScope, setAssignmentScope] = useState('unassigned');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [executives, setExecutives] = useState<User[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Assignment Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedExecutiveId, setSelectedExecutiveId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);

  // History Modal State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<AssignmentHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const fetchLeads = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const queryParams: Record<string, string | number> = {
          page: pagination.page,
          limit: pagination.limit,
        };

        if (search.trim()) {
          queryParams['search'] = search.trim();
        }

        if (assignmentScope === 'unassigned') {
          queryParams['assigned'] = 'false';
        } else if (assignmentScope === 'assigned') {
          queryParams['assigned'] = 'true';
        }

        const res = await leadService.getLeads(queryParams as any);
        setLeads(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch leads for assignment';
        setNotification({ type: 'error', message });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [pagination.page, pagination.limit, search, assignmentScope]
  );

  const fetchExecutives = useCallback(async () => {
    try {
      const execs = await leadService.getActiveExecutives();
      setExecutives(execs);
    } catch (err) {
      console.error('Failed to load executives:', err);
    }
  }, []);

  useEffect(() => {
    fetchExecutives();
  }, [fetchExecutives]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Open Assign / Reassign Modal
  const openAssignModal = (lead: Lead) => {
    setSelectedLead(lead);
    setSelectedExecutiveId(lead.assignedExecutiveId || '');
    setIsAssignModalOpen(true);
  };

  // Submit Assignment
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !selectedExecutiveId) return;

    setIsAssigning(true);
    try {
      await leadService.assignLead(selectedLead.id, selectedExecutiveId);
      setNotification({
        type: 'success',
        message: `Successfully allocated "${selectedLead.customerName}" to sales executive!`,
      });
      setIsAssignModalOpen(false);
      fetchLeads(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to assign lead';
      setNotification({ type: 'error', message });
    } finally {
      setIsAssigning(false);
    }
  };

  // Open Assignment History Modal
  const openHistoryModal = async (lead: Lead) => {
    setSelectedLead(lead);
    setIsHistoryModalOpen(true);
    setIsLoadingHistory(true);

    try {
      const history = await leadService.getAssignmentHistory(lead.id);
      setHistoryItems(history);
    } catch (err: unknown) {
      console.error('Failed to fetch assignment history:', err);
      setHistoryItems([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const columns: Column<Lead>[] = [
    {
      header: 'Customer',
      accessorKey: 'customerName',
      render: (lead) => (
        <div>
          <span className="font-semibold text-slate-900">{lead.customerName}</span>
          <span className="block text-xs text-slate-500">{lead.mobileNumber}</span>
        </div>
      ),
    },
    {
      header: 'Location & Need',
      render: (lead) => (
        <span className="text-xs text-slate-700">
          {lead.propertyCategory} &middot; {lead.preferredLocation}
        </span>
      ),
    },
    {
      header: 'Budget',
      accessorKey: 'budget',
      render: (lead) => (
        <span className="font-semibold text-xs text-slate-800">
          ₹{Number(lead.budget).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      render: (lead) => <StatusBadge status={lead.status} size="sm" />,
    },
    {
      header: 'Current Assignee',
      render: (lead) =>
        lead.assignedExecutive ? (
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            <span className="text-xs font-semibold text-slate-800">
              {lead.assignedExecutive.name}
            </span>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">
            <UserX className="h-3 w-3" />
            Unassigned
          </span>
        ),
    },
    {
      header: 'Actions',
      render: (lead) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openAssignModal(lead)}
            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>{lead.assignedExecutive ? 'Reassign' : 'Assign'}</span>
          </button>
          <button
            type="button"
            onClick={() => openHistoryModal(lead)}
            title="View assignment audit trail"
            className="inline-flex items-center rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <History className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lead Distribution & Allocation"
        description="Allocate incoming prospective tenant enquiries across Bengaluru to sales executives with complete assignment audit history."
        breadcrumbs={[
          { label: 'Admin', href: '/admin/overview' },
          { label: 'Assign Leads' },
        ]}
        actions={
          <button
            type="button"
            onClick={() => fetchLeads(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* Notifications */}
      {notification && (
        <div
          className={`flex items-center justify-between rounded-xl border p-4 text-xs shadow-xs animate-in fade-in duration-200 ${
            notification.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="rounded p-1 hover:bg-black/5"
          >
            &times;
          </button>
        </div>
      )}

      {/* Info notice */}
      <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-900 shadow-xs">
        <AlertCircle className="h-4 w-4 shrink-0 text-blue-600" />
        <span>
          Lead assignment persists a permanent audit ledger in PostgreSQL. Reassigning a lead automatically closes previous active assignments with timestamps, preventing data corruption or orphan records.
        </span>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={(val) => {
            setSearch(val);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          placeholder="Search by customer name or phone..."
          className="w-full sm:max-w-xs"
        />

        <FilterDropdown
          value={assignmentScope}
          onChange={(val) => {
            setAssignmentScope(val);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          options={[
            { label: 'Unassigned Leads Only', value: 'unassigned' },
            { label: 'Assigned Leads Only', value: 'assigned' },
            { label: 'All Inbound Leads', value: 'all' },
          ]}
          icon={Filter}
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={leads}
        keyExtractor={(lead) => lead.id}
        isLoading={isLoading}
        emptyTitle="No leads found matching criteria"
        emptyDescription="All incoming customer enquiries have either been assigned or match no filter."
        pagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          total: pagination.total,
          limit: pagination.limit,
          onPageChange: (newPage) => setPagination((prev) => ({ ...prev, page: newPage })),
        }}
      />

      {/* Assign / Reassign Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={selectedLead?.assignedExecutive ? 'Reassign Sales Executive' : 'Assign Sales Executive'}
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-3 text-xs border border-slate-200">
            <span className="block font-semibold text-slate-800">
              {selectedLead?.customerName} ({selectedLead?.mobileNumber})
            </span>
            <span className="text-slate-500">
              {selectedLead?.propertyCategory} &middot; {selectedLead?.preferredLocation} &middot; ₹{Number(selectedLead?.budget).toLocaleString('en-IN')}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Select Sales Executive *
            </label>
            <select
              value={selectedExecutiveId}
              onChange={(e) => setSelectedExecutiveId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            >
              <option value="" disabled>
                -- Choose Executive --
              </option>
              {executives.map((exec) => (
                <option key={exec.id} value={exec.id}>
                  {exec.name} ({exec.email})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isAssigning || !selectedExecutiveId}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {isAssigning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{selectedLead?.assignedExecutive ? 'Confirm Reassignment' : 'Assign Lead'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Assignment History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="Assignment Audit Trail"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-3 text-xs border border-slate-200">
            <span className="block font-semibold text-slate-800">
              {selectedLead?.customerName}
            </span>
            <span className="text-slate-500">
              Audit log of sales executives assigned to this enquiry
            </span>
          </div>

          {isLoadingHistory ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : historyItems.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No historical assignment changes recorded for this lead.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {historyItems.map((item) => (
                <div key={item.id} className="py-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">
                      {item.executive.name}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(item.assignedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {item.unassignedAt ? (
                      <span className="text-amber-700">
                        Unassigned on{' '}
                        {new Date(item.unassignedAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-semibold">Active Assignment</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(false)}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminAssignPage;
