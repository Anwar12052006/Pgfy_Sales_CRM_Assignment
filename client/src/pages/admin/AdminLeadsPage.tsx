import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Filter,
  RefreshCw,
  Edit2,
  UserCheck,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
  Eye,
} from 'lucide-react';
import {
  PageHeader,
  SearchInput,
  FilterDropdown,
  DataTable,
  StatusBadge,
} from '@/components/common';
import { Modal, FormInput } from '@/components/ui';
import { LeadDetailDrawer } from '@/components/leads/LeadDetailDrawer';
import { leadService } from '@/services/leadService';
import type { Lead, Column, User, PaginationMetadata } from '@/types';
import { LeadStatus } from '@/types';
import { leadFormSchema, type LeadFormData } from '@/utils/validators';
import { z } from 'zod';

const PROPERTY_CATEGORIES = [
  '1 BHK',
  '2 BHK',
  '3 BHK',
  '4 BHK',
  'Studio Apartment',
  'Villa',
  'Shared Room / PG',
];

const LEAD_SOURCES = [
  'Website',
  'Google Ads',
  'Facebook',
  'Instagram',
  'Referral',
  'Direct Enquiry',
  'Walk-in',
];

export const AdminLeadsPage: React.FC = () => {
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

  // Filters State
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [assignmentFilter, setAssignmentFilter] = useState<string>('');
  const [executiveFilter, setExecutiveFilter] = useState<string>('');

  // Active Sales Executives for assignment dropdowns
  const [executives, setExecutives] = useState<User[]>([]);

  // Notification Banner
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [assigningLead, setAssigningLead] = useState<Lead | null>(null);
  const [selectedExecutiveId, setSelectedExecutiveId] = useState<string>('');
  const [selectedLeadForDrawer, setSelectedLeadForDrawer] = useState<Lead | null>(null);

  // Form State & Validation
  const [formData, setFormData] = useState<Partial<LeadFormData>>({
    customerName: '',
    mobileNumber: '',
    email: '',
    propertyCategory: '2 BHK',
    preferredLocation: '',
    budget: 25000,
    leadSource: 'Website',
    status: LeadStatus.NEW,
    assignedExecutiveId: null,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-dismiss notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Load active executives on mount
  useEffect(() => {
    leadService.getActiveExecutives().then(setExecutives).catch(() => {});
  }, []);

  // Fetch leads from backend
  const fetchLeads = useCallback(
    async (pageToLoad = 1, showRefreshSpinner = false) => {
      if (showRefreshSpinner) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const res = await leadService.getLeads({
          page: pageToLoad,
          limit: pagination.limit,
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          assigned: assignmentFilter || undefined,
          executiveId: executiveFilter || undefined,
        });

        setLeads(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } catch (err: unknown) {
        setNotification({
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to fetch leads',
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [pagination.limit, search, statusFilter, assignmentFilter, executiveFilter]
  );

  // Fetch when filters change
  useEffect(() => {
    fetchLeads(1);
  }, [fetchLeads]);

  // Handle Search Input Debounce
  const handleSearchChange = (val: string) => {
    setSearch(val);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormData({
      customerName: '',
      mobileNumber: '',
      email: '',
      propertyCategory: '2 BHK',
      preferredLocation: '',
      budget: 25000,
      leadSource: 'Website',
      status: LeadStatus.NEW,
      assignedExecutiveId: null,
    });
    setFormErrors({});
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (lead: Lead) => {
    setEditingLead(lead);
    setFormData({
      customerName: lead.customerName,
      mobileNumber: lead.mobileNumber,
      email: lead.email || '',
      propertyCategory: lead.propertyCategory,
      preferredLocation: lead.preferredLocation,
      budget: Number(lead.budget),
      leadSource: lead.leadSource,
      status: lead.status,
    });
    setFormErrors({});
  };

  // Open Assign Modal
  const handleOpenAssign = (lead: Lead) => {
    setAssigningLead(lead);
    setSelectedExecutiveId(lead.assignedExecutiveId || '');
  };

  // Validate form with Zod
  const validateLeadForm = (): boolean => {
    try {
      leadFormSchema.parse(formData);
      setFormErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        for (const issue of err.issues) {
          const path = issue.path[0] as string;
          errors[path] = issue.message;
        }
        setFormErrors(errors);
      }
      return false;
    }
  };

  // Submit Create Lead
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLeadForm()) return;

    setIsSubmitting(true);
    try {
      await leadService.createLead({
        customerName: formData.customerName!.trim(),
        mobileNumber: formData.mobileNumber!.trim(),
        email: formData.email?.trim() || null,
        propertyCategory: formData.propertyCategory!,
        preferredLocation: formData.preferredLocation!.trim(),
        budget: Number(formData.budget),
        leadSource: formData.leadSource!,
        status: formData.status as LeadStatus,
        assignedExecutiveId: formData.assignedExecutiveId || null,
      });

      setIsCreateModalOpen(false);
      setNotification({
        type: 'success',
        message: `Lead for ${formData.customerName} registered successfully!`,
      });
      fetchLeads(1);
    } catch (err: unknown) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to create lead',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit Lead
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead || !validateLeadForm()) return;

    setIsSubmitting(true);
    try {
      await leadService.updateLead(editingLead.id, {
        customerName: formData.customerName!.trim(),
        mobileNumber: formData.mobileNumber!.trim(),
        email: formData.email?.trim() || null,
        propertyCategory: formData.propertyCategory!,
        preferredLocation: formData.preferredLocation!.trim(),
        budget: Number(formData.budget),
        leadSource: formData.leadSource!,
        status: formData.status as LeadStatus,
      });

      setEditingLead(null);
      setNotification({
        type: 'success',
        message: `Lead #${editingLead.customerName} updated successfully!`,
      });
      fetchLeads(pagination.page);
    } catch (err: unknown) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to update lead',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Assignment
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningLead || !selectedExecutiveId) return;

    setIsSubmitting(true);
    try {
      await leadService.assignLead(assigningLead.id, selectedExecutiveId);
      const assignedExec = executives.find((x) => x.id === selectedExecutiveId);

      setAssigningLead(null);
      setNotification({
        type: 'success',
        message: `Lead allocated to ${assignedExec?.name || 'Sales Executive'} successfully!`,
      });
      fetchLeads(pagination.page);
    } catch (err: unknown) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to assign lead',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Data Table Columns
  const columns: Column<Lead>[] = [
    {
      header: 'Customer Name',
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
      header: 'Category',
      accessorKey: 'propertyCategory',
      render: (lead) => (
        <span className="text-xs font-medium text-gray-800">
          {lead.propertyCategory}
        </span>
      ),
    },
    {
      header: 'Location',
      accessorKey: 'preferredLocation',
      render: (lead) => (
        <span className="text-xs text-gray-600 truncate max-w-[130px] block">
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
      header: 'Source',
      accessorKey: 'leadSource',
      render: (lead) => (
        <span className="text-xs text-gray-500">{lead.leadSource}</span>
      ),
    },
    {
      header: 'Assigned Executive',
      render: (lead) =>
        lead.assignedExecutive ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-xs text-gray-800">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            {lead.assignedExecutive.name}
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
            Unassigned
          </span>
        ),
    },
    {
      header: 'Status',
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
            onClick={() => setSelectedLeadForDrawer(lead)}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            title="View Details & Call History"
          >
            <Eye className="h-3 w-3 text-gray-500" />
            <span>Details</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenAssign(lead)}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
            title="Assign / Reassign Executive"
          >
            <UserCheck className="h-3 w-3" />
            <span>Assign</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenEdit(lead)}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            title="Edit Lead Details"
          >
            <Edit2 className="h-3 w-3" />
            <span>Edit</span>
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
        title="Lead Management"
        description="Comprehensive directory of prospective student & tenant requirements across Bengaluru"
        breadcrumbs={[
          { label: 'Admin', href: '/admin/overview' },
          { label: 'Leads' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchLeads(pagination.page, true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 focus:outline-none transition-colors"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-gray-500 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`}
              />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 focus:outline-none transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Lead</span>
            </button>
          </div>
        }
      />

      {/* Filters Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by customer name or phone..."
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

          <FilterDropdown
            value={assignmentFilter}
            onChange={(val) => setAssignmentFilter(val)}
            options={[
              { label: 'Assigned Leads Only', value: 'true' },
              { label: 'Unassigned Leads Only', value: 'false' },
            ]}
            allOptionLabel="All Workloads"
          />

          {executives.length > 0 && (
            <FilterDropdown
              value={executiveFilter}
              onChange={(val) => setExecutiveFilter(val)}
              options={executives.map((exec) => ({
                label: exec.name,
                value: exec.id,
              }))}
              allOptionLabel="All Executives"
            />
          )}
        </div>

        <div className="text-xs font-medium text-gray-500">
          Showing <span className="font-bold text-gray-900">{leads.length}</span> of{' '}
          <span className="font-bold text-gray-900">{pagination.total}</span> leads
        </div>
      </div>

      {/* Leads Data Table */}
      <DataTable
        columns={columns}
        data={leads}
        keyExtractor={(lead) => lead.id}
        isLoading={isLoading}
        emptyTitle="No leads matching your filters"
        emptyDescription="Try clearing your search query or adjusting your status filters to find leads."
        pagination={{
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total,
          totalPages: pagination.totalPages,
          onPageChange: (newPage) => fetchLeads(newPage),
        }}
      />

      {/* ── CREATE LEAD MODAL ───────────────────────────────────────── */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add Prospective Tenant Lead"
        description="Enter requirement information to register a new lead into PGfy CRM"
        maxWidth="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isSubmitting}
              className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Save Lead</span>
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="Customer Full Name"
              placeholder="e.g. Rahul Sharma"
              value={formData.customerName || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, customerName: e.target.value }))
              }
              error={formErrors.customerName}
              isRequired
            />
            <FormInput
              label="Mobile Number (10 Digits)"
              placeholder="e.g. 9876543210"
              value={formData.mobileNumber || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, mobileNumber: e.target.value }))
              }
              error={formErrors.mobileNumber}
              isRequired
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="Email Address (Optional)"
              type="email"
              placeholder="e.g. rahul@example.com"
              value={formData.email || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              error={formErrors.email}
            />
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Property Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.propertyCategory}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, propertyCategory: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {PROPERTY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="Preferred Location"
              placeholder="e.g. Whitefield, Bengaluru"
              value={formData.preferredLocation || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, preferredLocation: e.target.value }))
              }
              error={formErrors.preferredLocation}
              isRequired
            />
            <FormInput
              label="Budget (INR Monthly)"
              type="number"
              placeholder="e.g. 25000"
              value={formData.budget || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, budget: Number(e.target.value) }))
              }
              error={formErrors.budget}
              isRequired
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Lead Source <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.leadSource}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, leadSource: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {LEAD_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Initial Executive Assignment (Optional)
              </label>
              <select
                value={formData.assignedExecutiveId || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    assignedExecutiveId: e.target.value || null,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Leave Unassigned</option>
                {executives.map((exec) => (
                  <option key={exec.id} value={exec.id}>
                    {exec.name} ({exec.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* ── EDIT LEAD MODAL ─────────────────────────────────────────── */}
      <Modal
        isOpen={Boolean(editingLead)}
        onClose={() => setEditingLead(null)}
        title={`Edit Lead: ${editingLead?.customerName || ''}`}
        description="Modify requirement details and contact info for this prospective tenant"
        maxWidth="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditingLead(null)}
              disabled={isSubmitting}
              className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleEditSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Save Changes</span>
            </button>
          </>
        }
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="Customer Full Name"
              value={formData.customerName || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, customerName: e.target.value }))
              }
              error={formErrors.customerName}
              isRequired
            />
            <FormInput
              label="Mobile Number (10 Digits)"
              value={formData.mobileNumber || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, mobileNumber: e.target.value }))
              }
              error={formErrors.mobileNumber}
              isRequired
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="Email Address"
              type="email"
              value={formData.email || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              error={formErrors.email}
            />
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Property Category
              </label>
              <select
                value={formData.propertyCategory}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, propertyCategory: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {PROPERTY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="Preferred Location"
              value={formData.preferredLocation || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, preferredLocation: e.target.value }))
              }
              error={formErrors.preferredLocation}
              isRequired
            />
            <FormInput
              label="Budget (INR Monthly)"
              type="number"
              value={formData.budget || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, budget: Number(e.target.value) }))
              }
              error={formErrors.budget}
              isRequired
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Lead Source
              </label>
              <select
                value={formData.leadSource}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, leadSource: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {LEAD_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Lead Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, status: e.target.value as LeadStatus }))
                }
                className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {Object.values(LeadStatus).map((st) => (
                  <option key={st} value={st}>
                    {st.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* ── ASSIGN / REASSIGN EXECUTIVE MODAL ───────────────────────── */}
      <Modal
        isOpen={Boolean(assigningLead)}
        onClose={() => setAssigningLead(null)}
        title="Assign / Reassign Sales Executive"
        description={`Allocate ${assigningLead?.customerName}'s enquiry to an active sales executive.`}
        maxWidth="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setAssigningLead(null)}
              disabled={isSubmitting}
              className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAssignSubmit}
              disabled={isSubmitting || !selectedExecutiveId}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Confirm Assignment</span>
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600 space-y-1">
            <div>
              <span className="font-semibold text-gray-700">Customer:</span>{' '}
              {assigningLead?.customerName} ({assigningLead?.mobileNumber})
            </div>
            <div>
              <span className="font-semibold text-gray-700">Requirement:</span>{' '}
              {assigningLead?.propertyCategory} in {assigningLead?.preferredLocation}
            </div>
            <div>
              <span className="font-semibold text-gray-700">Current Assignee:</span>{' '}
              {assigningLead?.assignedExecutive?.name || 'Currently Unassigned'}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
              Select Active Sales Executive <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedExecutiveId}
              onChange={(e) => setSelectedExecutiveId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select an Executive...</option>
              {executives.map((exec) => (
                <option key={exec.id} value={exec.id}>
                  {exec.name} — {exec.email}
                </option>
              ))}
            </select>
          </div>

          <p className="text-[11px] text-gray-500">
            Note: Every reassignment automatically updates the PostgreSQL audit history and unassigns the previous active executive.
          </p>
        </div>
      </Modal>

      {/* Lead Detail & Call History Drawer */}
      <LeadDetailDrawer
        lead={selectedLeadForDrawer}
        isOpen={Boolean(selectedLeadForDrawer)}
        onClose={() => setSelectedLeadForDrawer(null)}
        onLeadUpdated={() => fetchLeads(pagination.page)}
      />
    </div>
  );
};

export default AdminLeadsPage;
