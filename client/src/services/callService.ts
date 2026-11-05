import { api } from './api';
import type {
  Call,
  RecordCallInput,
  QueryCallsParams,
  ApiResponse,
  PaginationMetadata,
} from '@/types';

export const callService = {
  /**
   * Fetch paginated list of calls with optional filters (outcome, leadId, executiveId, dates)
   */
  async getCalls(
    params?: QueryCallsParams
  ): Promise<{ data: Call[]; pagination?: PaginationMetadata }> {
    const response = await api.get<ApiResponse<Call[]> & { pagination?: PaginationMetadata }>(
      '/calls',
      { params }
    );
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to fetch call records');
    }
    return {
      data: response.data.data || [],
      pagination: response.data.pagination,
    };
  },

  /**
   * Fetch complete call history timeline for a specific lead
   */
  async getCallsByLead(leadId: string): Promise<Call[]> {
    const response = await api.get<ApiResponse<Call[] | { lead: unknown; calls: Call[] }>>(`/leads/${leadId}/calls`);
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to fetch call history for lead');
    }
    const data = response.data.data;
    if (Array.isArray(data)) {
      return data;
    }
    if (data && typeof data === 'object' && 'calls' in data && Array.isArray((data as { calls: Call[] }).calls)) {
      return (data as { calls: Call[] }).calls;
    }
    return [];
  },

  /**
   * Record a new phone call for a lead (assigned executive or admin)
   */
  async recordCall(input: RecordCallInput): Promise<Call> {
    const response = await api.post<ApiResponse<Call>>('/calls', input);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to record call');
    }
    return response.data.data;
  },

  /**
   * Retrieve a single call record details by ID
   */
  async getCallById(id: string): Promise<Call> {
    const response = await api.get<ApiResponse<Call>>(`/calls/${id}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch call record');
    }
    return response.data.data;
  },
};

export default callService;
