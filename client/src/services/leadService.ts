import { api } from './api';
import type { ApiResponse, PaginatedResponse, Lead, LeadStatus, User } from '@/types';

export interface LeadQueryParams {
  search?: string;
  status?: string;
  assigned?: 'true' | 'false' | string;
  executiveId?: string;
  page?: number;
  limit?: number;
}

export interface CreateLeadPayload {
  customerName: string;
  mobileNumber: string;
  email?: string | null;
  propertyCategory: string;
  preferredLocation: string;
  budget: number;
  leadSource: string;
  status?: LeadStatus;
  enquiryDate?: string;
  assignedExecutiveId?: string | null;
}

export interface UpdateLeadPayload {
  customerName?: string;
  mobileNumber?: string;
  email?: string | null;
  propertyCategory?: string;
  preferredLocation?: string;
  budget?: number;
  leadSource?: string;
  status?: LeadStatus;
  enquiryDate?: string;
}

export interface AssignmentHistoryItem {
  id: string;
  leadId: string;
  executiveId: string;
  assignedById: string;
  assignedAt: string;
  unassignedAt: string | null;
  executive: {
    id: string;
    name: string;
    email: string;
  };
  assignedBy: {
    id: string;
    name: string;
    email: string;
  };
}

export const leadService = {
  /**
   * Fetch paginated leads with filtering & search.
   * Admin retrieves all matching leads; Executive retrieves only their assigned leads.
   */
  async getLeads(params?: LeadQueryParams): Promise<PaginatedResponse<Lead>> {
    const response = await api.get<PaginatedResponse<Lead>>('/leads', {
      params,
    });
    return response.data;
  },

  /**
   * Retrieve single lead details by ID.
   */
  async getLeadById(id: string): Promise<Lead> {
    const response = await api.get<ApiResponse<Lead>>(`/leads/${id}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch lead');
    }
    return response.data.data;
  },

  /**
   * Create a new lead (Admin only).
   */
  async createLead(payload: CreateLeadPayload): Promise<Lead> {
    const response = await api.post<ApiResponse<Lead>>('/leads', payload);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to create lead');
    }
    return response.data.data;
  },

  /**
   * Update general lead details (Admin only).
   */
  async updateLead(id: string, payload: UpdateLeadPayload): Promise<Lead> {
    const response = await api.put<ApiResponse<Lead>>(`/leads/${id}`, payload);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to update lead');
    }
    return response.data.data;
  },

  /**
   * Update lead status (Admin or assigned Executive).
   */
  async updateLeadStatus(id: string, status: LeadStatus): Promise<Lead> {
    const response = await api.patch<ApiResponse<Lead>>(`/leads/${id}/status`, { status });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to update lead status');
    }
    return response.data.data;
  },

  /**
   * Assign or reassign lead to executive (Admin only).
   */
  async assignLead(id: string, executiveId: string): Promise<Lead> {
    const response = await api.patch<ApiResponse<Lead>>(`/leads/${id}/assign`, { executiveId });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to assign lead');
    }
    return response.data.data;
  },

  /**
   * View assignment audit history for a lead (Admin only).
   */
  async getAssignmentHistory(id: string): Promise<AssignmentHistoryItem[]> {
    const response = await api.get<ApiResponse<AssignmentHistoryItem[]>>(`/leads/${id}/assignments`);
    return response.data.data || [];
  },

  /**
   * List active sales executives for assignment dropdowns (Admin only).
   */
  async getActiveExecutives(): Promise<User[]> {
    const response = await api.get<ApiResponse<User[]>>('/users/executives');
    return response.data.data || [];
  },
};

export default leadService;
