import { api } from './api';
import type {
  ApiResponse,
  PaginatedResponse,
  FollowUp,
  QueryFollowUpsParams,
  CreateFollowUpInput,
  RescheduleFollowUpInput,
  FollowUpStatus,
} from '@/types';

export const followUpService = {
  /**
   * Fetch paginated follow-up tasks with optional filters.
   * Scoped strictly by backend RBAC (Admin sees all; Executive sees only own).
   */
  async getFollowUps(params: QueryFollowUpsParams = {}): Promise<PaginatedResponse<FollowUp>> {
    const response = await api.get<PaginatedResponse<FollowUp>>('/followups', { params });
    return response.data;
  },

  /**
   * Fetch single follow-up detail by ID.
   */
  async getFollowUpById(id: string): Promise<FollowUp> {
    const response = await api.get<ApiResponse<FollowUp>>(`/followups/${id}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch follow-up detail');
    }
    return response.data.data;
  },

  /**
   * Schedule a new follow-up task.
   */
  async createFollowUp(payload: CreateFollowUpInput): Promise<FollowUp> {
    const response = await api.post<ApiResponse<FollowUp>>('/followups', payload);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to schedule follow-up');
    }
    return response.data.data;
  },

  /**
   * Update follow-up status to COMPLETED or CANCELLED.
   */
  async updateStatus(id: string, status: 'COMPLETED' | 'CANCELLED' | FollowUpStatus): Promise<FollowUp> {
    const response = await api.patch<ApiResponse<FollowUp>>(`/followups/${id}/status`, { status });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to update follow-up status');
    }
    return response.data.data;
  },

  /**
   * Reschedule an existing pending follow-up.
   */
  async reschedule(id: string, payload: RescheduleFollowUpInput): Promise<FollowUp> {
    const response = await api.patch<ApiResponse<FollowUp>>(`/followups/${id}/reschedule`, payload);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to reschedule follow-up');
    }
    return response.data.data;
  },
};

export default followUpService;
