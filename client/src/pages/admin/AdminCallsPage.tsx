import React, { useState, useEffect, useCallback } from 'react';
import {
  Filter,
  RefreshCw,
  Clock,
  Calendar,
  CheckCircle,
  AlertCircle,
  X,
  Eye,
  User as UserIcon,
} from 'lucide-react';
import {
  PageHeader,
  SearchInput,
  FilterDropdown,
  DataTable,
} from '@/components/common';
import { CallOutcomeBadge } from '@/components/common/StatusBadge';
import { CallDetailModal, formatDuration, formatDateTime } from '@/components/calls';
import { LeadDetailDrawer } from '@/components/leads';
import { callService } from '@/services/callService';
import { leadService } from '@/services/leadService';
import type { Call, Column, PaginationMetadata, DrawerLead, User } from '@/types';
import { CallOutcome } from '@/types';

export const AdminCallsPage: React.FC = () => {
  // Calls and pagination state
  const [calls, setCalls] = useState<Call[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Active executives for filter
  const [executives, setExecutives] = useState<User[]>([]);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('');
  const [executiveFilter, setExecutiveFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Modals
  const [selectedCallForDetail, setSelectedCallForDetail] = useState<Call | null>(null);
  const [selectedLeadForDrawer, setSelectedLeadForDrawer] = useState<DrawerLead | null>(null);

  // Notification Toast
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

  // Load executives on mount
  useEffect(() => {
    const loadExecutives = async () => {
      try {
        const execs = await leadService.getActiveExecutives();
        setExecutives(execs);
      } catch (err) {
        console.error('Failed to load executives for call filter:', err);
      }
    };
    loadExecutives();
  }, []);

  // Fetch calls with all filters
  const fetchCalls = useCallback(
    async (pageToLoad = 1, showRefresh = false) => {
      if (showRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const res = await callService.getCalls({
          page: pageToLoad,
          limit: pagination.limit,
          outcome: outcomeFilter || undefined,
          executiveId: executiveFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });

        setCalls(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } catch (err: unknown) {
        setNotification({
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to fetch call audit records',
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [pagination.limit, outcomeFilter, executiveFilter, startDate, endDate]
  );

  useEffect(() => {
    fetchCalls(1);
  }, [fetchCalls]);

  const handleClearDateRange = () => {
    setStartDate('');
    setEndDate('');
  };

  // Client-side search filtering by customer name, phone, or notes
  const filteredCalls = calls.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const custName = c.lead?.customerName?.toLowerCase() || '';
    const custPhone = c.lead?.mobileNumber || '';
    const execName = c.executive?.name?.toLowerCase() || '';
    const notes = c.notes?.toLowerCase() || '';
    return custName.includes(q) || custPhone.includes(q) || execName.includes(q) || notes.includes(q);
  });

  const columns: Column<Call>[] = [
    {
      header: 'Customer',
      accessorKey: 'lead',
      render: (call) => (
        <div>
          <button
            type="button"
            onClick={() => call.lead && setSelectedLeadForDrawer(call.lead)}
            className="font-semibold text-slate-900 hover:text-blue-600 hover:underline block text-left"
          >
            {call.lead?.customerName || 'Unknown Lead'}
          </button>
          <span className="text-xs text-slate-500 font-mono">
            {call.lead?.mobileNumber || '—'}
          </span>
        </div>
      ),
    },
    {
      header: 'Sales Executive',
      accessorKey: 'executive',
      render: (call) => (
        <div>
          <span className="font-medium text-slate-900 block text-xs">
            {call.executive?.name || 'Unknown Executive'}
          </span>
          <span className="text-[11px] text-slate-400">
            {call.executive?.email || '—'}
          </span>
        </div>
      ),
    },
    {
      header: 'Outcome',
      accessorKey: 'outcome',
      render: (call) => <CallOutcomeBadge outcome={call.outcome} />,
    },
    {
      header: 'Duration',
      accessorKey: 'durationSeconds',
      render: (call) => (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
          <Clock className="w-3 h-3 text-slate-400" />
          {formatDuration(call.durationSeconds)}
        </span>
      ),
    },
    {
      header: 'Call Notes',
      accessorKey: 'notes',
      render: (call) => (
        <div className="max-w-xs truncate text-xs text-slate-600" title={call.notes ?? undefined}>
          {call.notes || <span className="italic text-slate-400">No notes</span>}
        </div>
      ),
    },
    {
      header: 'Next Follow-up',
      render: (call) => {
        const nextFollowUp = call.followUps && call.followUps.length > 0 ? call.followUps[0] : null;
        if (!nextFollowUp) {
          return <span className="text-xs text-slate-400">—</span>;
        }
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            <Calendar className="w-3 h-3 text-amber-500" />
            {new Date(nextFollowUp.dueAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        );
      },
    },
    {
      header: 'Timestamp',
      accessorKey: 'callDateTime',
      render: (call) => (
        <span className="text-xs text-slate-500 whitespace-nowrap">
          {formatDateTime(call.callDateTime)}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (call) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedCallForDetail(call)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs"
            title="Inspect Call Audit Details"
          >
            <Eye className="w-3 h-3 text-slate-500" />
            <span>Details</span>
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
        title="Call History & Audio Logs"
        description="Comprehensive audit of all customer calls, outcomes, discussion notes, and scheduled follow-ups across the sales team"
        breadcrumbs={[
          { label: 'Admin', href: '/admin/overview' },
          { label: 'Call History' },
        ]}
        actions={
          <button
            type="button"
            onClick={() => fetchCalls(pagination.page, true)}
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

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-xs space-y-3">
        {/* Row 1: Search, Executive Filter, Outcome Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by customer, executive, or notes..."
            className="w-full sm:max-w-xs"
          />

          {/* Executive Filter */}
          <FilterDropdown
            value={executiveFilter}
            onChange={(val) => setExecutiveFilter(val)}
            options={executives.map((ex) => ({
              label: ex.name,
              value: ex.id,
            }))}
            allOptionLabel="All Executives"
            icon={UserIcon}
          />

          {/* Outcome Filter */}
          <FilterDropdown
            value={outcomeFilter}
            onChange={(val) => setOutcomeFilter(val)}
            options={Object.values(CallOutcome).map((outcome) => ({
              label: outcome.replace(/_/g, ' '),
              value: outcome,
            }))}
            allOptionLabel="All Outcomes"
            icon={Filter}
          />
        </div>

        {/* Row 2: Date Range Picker */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Date Range:
            </span>

            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                title="Start Date"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                title="End Date"
              />
            </div>

            {(startDate || endDate) && (
              <button
                type="button"
                onClick={handleClearDateRange}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 transition"
              >
                <X className="w-3 h-3" />
                Clear Dates
              </button>
            )}
          </div>

          <div className="text-xs font-medium text-slate-500">
            Showing <span className="font-bold text-slate-900">{filteredCalls.length}</span> of{' '}
            <span className="font-bold text-slate-900">{pagination.total}</span> call records
          </div>
        </div>
      </div>

      {/* Calls Data Table */}
      <DataTable
        columns={columns}
        data={filteredCalls}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        emptyTitle="No call records found"
        emptyDescription="Logged calls from sales executives will be recorded and displayed here with full audit trail."
        pagination={{
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total,
          totalPages: pagination.totalPages,
          onPageChange: (newPage) => fetchCalls(newPage),
        }}
      />

      {/* Call Detail Modal */}
      <CallDetailModal
        call={selectedCallForDetail}
        isOpen={Boolean(selectedCallForDetail)}
        onClose={() => setSelectedCallForDetail(null)}
      />

      {/* Lead Detail Drawer (can be inspected by Admin too!) */}
      <LeadDetailDrawer
        lead={selectedLeadForDrawer}
        isOpen={Boolean(selectedLeadForDrawer)}
        onClose={() => setSelectedLeadForDrawer(null)}
        onLeadUpdated={() => fetchCalls(pagination.page)}
      />
    </div>
  );
};

export default AdminCallsPage;
