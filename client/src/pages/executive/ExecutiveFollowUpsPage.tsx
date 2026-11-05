import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  CheckCircle,
  XCircle,
  RefreshCw,
  Phone,
  AlertCircle,
  X,
  MapPin,
  Eye,
  MessageSquare,
} from 'lucide-react';
import {
  PageHeader,
  SearchInput,
  FilterDropdown,
  DataTable,
  FollowUpBadge,
  CallOutcomeBadge,
  ConfirmDialog,
} from '@/components/common';
import { RescheduleFollowUpModal } from '@/components/followups';
import { LeadDetailDrawer } from '@/components/leads';
import { CallDetailModal } from '@/components/calls';
import { followUpService } from '@/services/followUpService';
import { callService } from '@/services/callService';
import type {
  FollowUp,
  Column,
  PaginationMetadata,
  DrawerLead,
  Call,
} from '@/types';
import { FollowUpStatus } from '@/types';

export const ExecutiveFollowUpsPage: React.FC = () => {
  // Follow-ups & Pagination State
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Classification Tab: 'all' | 'today' | 'upcoming' | 'overdue' | 'completed'
  const [activeTab, setActiveTab] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  // Modals & Dialogs State
  const [reschedulingTask, setReschedulingTask] = useState<FollowUp | null>(null);
  const [cancellingTask, setCancellingTask] = useState<FollowUp | null>(null);
  const [completingTask, setCompletingTask] = useState<FollowUp | null>(null);
  const [selectedLeadForDrawer, setSelectedLeadForDrawer] = useState<DrawerLead | null>(null);
  const [selectedCallForDetail, setSelectedCallForDetail] = useState<Call | null>(null);

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

  // Fetch follow-ups from backend
  const fetchFollowUps = useCallback(
    async (pageToLoad = 1, showRefresh = false) => {
      if (showRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const res = await followUpService.getFollowUps({
          page: pageToLoad,
          limit: pagination.limit,
          classification: activeTab !== 'all' ? activeTab : undefined,
          status: statusFilter || undefined,
        });

        setFollowUps(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } catch (err: unknown) {
        setNotification({
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to fetch follow-up tasks',
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [pagination.limit, activeTab, statusFilter]
  );

  useEffect(() => {
    fetchFollowUps(1);
  }, [fetchFollowUps]);

  // Handle Mark Done
  const handleConfirmComplete = async () => {
    if (!completingTask) return;
    try {
      await followUpService.updateStatus(completingTask.id, FollowUpStatus.COMPLETED);
      setNotification({
        type: 'success',
        message: `Follow-up for ${completingTask.lead?.customerName || 'prospect'} marked as completed!`,
      });
      setCompletingTask(null);
      fetchFollowUps(pagination.page);
    } catch (err: unknown) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to complete follow-up',
      });
    }
  };

  // Handle Cancel
  const handleConfirmCancel = async () => {
    if (!cancellingTask) return;
    try {
      await followUpService.updateStatus(cancellingTask.id, FollowUpStatus.CANCELLED);
      setNotification({
        type: 'success',
        message: `Follow-up task cancelled.`,
      });
      setCancellingTask(null);
      fetchFollowUps(pagination.page);
    } catch (err: unknown) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to cancel follow-up',
      });
    }
  };

  // Open Call Detail
  const handleOpenCallDetail = async (callId: string) => {
    try {
      const call = await callService.getCallById(callId);
      setSelectedCallForDetail(call);
    } catch (err) {
      console.error('Failed to load call detail:', err);
      setNotification({
        type: 'error',
        message: 'Could not load linked call details',
      });
    }
  };

  // Search filter by customer name, mobile, notes, or location
  const filteredFollowUps = followUps.filter((f) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = f.lead?.customerName?.toLowerCase() || '';
    const phone = f.lead?.mobileNumber || '';
    const location = f.lead?.preferredLocation?.toLowerCase() || '';
    const notes = f.notes?.toLowerCase() || '';
    return name.includes(q) || phone.includes(q) || location.includes(q) || notes.includes(q);
  });

  // Table Columns
  const columns: Column<FollowUp>[] = [
    {
      header: 'Customer',
      accessorKey: 'lead',
      render: (f) => (
        <div>
          <button
            type="button"
            onClick={() => f.lead && setSelectedLeadForDrawer(f.lead)}
            className="font-semibold text-slate-900 hover:text-blue-600 hover:underline block text-left"
          >
            {f.lead?.customerName || 'Prospect'}
          </button>
          <span className="text-xs text-slate-500 font-mono">
            {f.lead?.mobileNumber || '—'}
          </span>
        </div>
      ),
    },
    {
      header: 'Preferred Location',
      render: (f) => (
        <span className="text-xs text-slate-600 flex items-center gap-1">
          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="truncate max-w-[120px]">{f.lead?.preferredLocation || '—'}</span>
        </span>
      ),
    },
    {
      header: 'Due Date & Time',
      accessorKey: 'dueAt',
      render: (f) => {
        const isOverdue = f.classification === 'OVERDUE' && f.status === FollowUpStatus.PENDING;
        const isToday = f.classification === 'TODAY' && f.status === FollowUpStatus.PENDING;

        return (
          <div className="space-y-1">
            <span
              className={`text-xs block font-medium whitespace-nowrap ${
                isOverdue
                  ? 'text-rose-700 font-semibold'
                  : isToday
                  ? 'text-amber-800 font-semibold'
                  : 'text-slate-700'
              }`}
            >
              {new Date(f.dueAt).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })}
            </span>
            <FollowUpBadge classification={f.classification} status={f.status} size="sm" />
          </div>
        );
      },
    },
    {
      header: 'Related Call Outcome',
      render: (f) => {
        if (!f.call && !f.callId) {
          return <span className="text-xs text-slate-400">Direct Schedule</span>;
        }

        return (
          <button
            type="button"
            onClick={() => f.callId && handleOpenCallDetail(f.callId)}
            className="group inline-flex items-center gap-1"
            title="Inspect related call log"
          >
            {f.call?.outcome ? (
              <CallOutcomeBadge outcome={f.call.outcome} size="sm" />
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                <Phone className="w-3 h-3" />
                View Call
              </span>
            )}
          </button>
        );
      },
    },
    {
      header: 'Notes / Agenda',
      accessorKey: 'notes',
      render: (f) => (
        <div
          className="max-w-xs truncate text-xs text-slate-600 flex items-start gap-1"
          title={f.notes ?? undefined}
        >
          {f.notes ? (
            <>
              <MessageSquare className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
              <span>{f.notes}</span>
            </>
          ) : (
            <span className="italic text-slate-400">No notes</span>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (f) => {
        const isPending = f.status === FollowUpStatus.PENDING;

        return (
          <div className="flex items-center justify-end gap-1.5">
            {isPending && (
              <>
                <button
                  type="button"
                  onClick={() => setCompletingTask(f)}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition shadow-2xs"
                  title="Mark follow-up as completed"
                >
                  <CheckCircle className="h-3 w-3" />
                  <span>Done</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReschedulingTask(f)}
                  className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition shadow-2xs"
                  title="Reschedule follow-up timing"
                >
                  <Calendar className="h-3 w-3" />
                  <span>Reschedule</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCancellingTask(f)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition shadow-2xs"
                  title="Cancel follow-up"
                >
                  <XCircle className="h-3 w-3" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => f.lead && setSelectedLeadForDrawer(f.lead)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              title="View Customer Profile"
            >
              <Eye className="h-3 w-3 text-slate-400" />
            </button>
          </div>
        );
      },
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
        title="My Follow-up Tasks"
        description="Tenant callbacks, scheduled property walkthroughs, and enquiry reminders assigned to your pipeline"
        breadcrumbs={[
          { label: 'Executive', href: '/executive/dashboard' },
          { label: 'Follow-ups' },
        ]}
        actions={
          <button
            type="button"
            onClick={() => fetchFollowUps(pagination.page, true)}
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

      {/* Filter Tabs & Search Controls */}
      <div className="space-y-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px">
          {[
            { id: 'all', label: 'All Tasks' },
            { id: 'today', label: "Today's Follow-ups" },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'overdue', label: 'Overdue Tasks' },
            { id: 'completed', label: 'Completed' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-xs font-semibold whitespace-nowrap rounded-t-lg transition border-b-2 -mb-px ${
                  isActive
                    ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Toolbar: Search & Direct Status Filter */}
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by customer name, mobile, or location..."
              className="w-full sm:max-w-xs"
            />
            <FilterDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { label: 'Pending', value: FollowUpStatus.PENDING },
                { label: 'Completed', value: FollowUpStatus.COMPLETED },
                { label: 'Cancelled', value: FollowUpStatus.CANCELLED },
              ]}
              allOptionLabel="All Statuses"
            />
          </div>

          <div className="text-xs font-medium text-slate-500">
            Showing <span className="font-bold text-slate-900">{filteredFollowUps.length}</span> of{' '}
            <span className="font-bold text-slate-900">{pagination.total}</span> tasks
          </div>
        </div>
      </div>

      {/* Follow-up Tasks Table */}
      <DataTable
        columns={columns}
        data={filteredFollowUps}
        keyExtractor={(f) => f.id}
        isLoading={isLoading}
        emptyTitle="No follow-up tasks found"
        emptyDescription={
          activeTab === 'overdue'
            ? 'Great job! You have zero overdue tasks.'
            : activeTab === 'today'
            ? 'No callbacks due today. Stay ahead with upcoming appointments.'
            : 'Schedule follow-up tasks directly when recording customer calls.'
        }
        pagination={{
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total,
          totalPages: pagination.totalPages,
          onPageChange: (newPage) => fetchFollowUps(newPage),
        }}
      />

      {/* Reschedule Modal */}
      <RescheduleFollowUpModal
        followUp={reschedulingTask}
        isOpen={Boolean(reschedulingTask)}
        onClose={() => setReschedulingTask(null)}
        onSuccess={() => {
          setNotification({
            type: 'success',
            message: 'Follow-up successfully rescheduled.',
          });
          fetchFollowUps(pagination.page);
        }}
      />

      {/* Mark Completed Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(completingTask)}
        onCancel={() => setCompletingTask(null)}
        onConfirm={handleConfirmComplete}
        title="Mark Follow-up as Completed?"
        message={`Are you sure you want to mark the scheduled follow-up for ${
          completingTask?.lead?.customerName || 'this prospect'
        } as completed?`}
        confirmLabel="Mark Completed"
        variant="primary"
      />

      {/* Cancel Task Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(cancellingTask)}
        onCancel={() => setCancellingTask(null)}
        onConfirm={handleConfirmCancel}
        title="Cancel Follow-up Task?"
        message={`Are you sure you want to cancel the scheduled callback for ${
          cancellingTask?.lead?.customerName || 'this prospect'
        }? Cancelled tasks cannot be rescheduled.`}
        confirmLabel="Cancel Task"
        variant="danger"
      />

      {/* Lead Detail Drawer */}
      <LeadDetailDrawer
        lead={selectedLeadForDrawer}
        isOpen={Boolean(selectedLeadForDrawer)}
        onClose={() => setSelectedLeadForDrawer(null)}
        onLeadUpdated={() => fetchFollowUps(pagination.page)}
      />

      {/* Related Call Detail Modal */}
      <CallDetailModal
        call={selectedCallForDetail}
        isOpen={Boolean(selectedCallForDetail)}
        onClose={() => setSelectedCallForDetail(null)}
      />
    </div>
  );
};

export default ExecutiveFollowUpsPage;
