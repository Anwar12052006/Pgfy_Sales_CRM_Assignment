import { api } from './api';
import type { ApiResponse, AdminDashboardData, ExecutiveDashboardData, ExecutivePerformance } from '@/types';

/**
 * Service handling dashboard telemetry & aggregated CRM metrics
 */
export const dashboardService = {
  /**
   * Fetch live Admin Dashboard metrics from GET /api/dashboard/admin
   */
  async getAdminDashboard(): Promise<AdminDashboardData> {
    const response = await api.get<ApiResponse<AdminDashboardData>>('/dashboard/admin');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to retrieve admin dashboard metrics');
    }
    return response.data.data;
  },

  /**
   * Fetch live Executive Dashboard metrics from GET /api/dashboard/executive
   * Scoped strictly to the authenticated executive
   */
  async getExecutiveDashboard(): Promise<ExecutiveDashboardData> {
    const response = await api.get<ApiResponse<ExecutiveDashboardData>>('/dashboard/executive');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to retrieve executive dashboard metrics');
    }
    return response.data.data;
  },

  /**
   * Fetch live Executive Performance metrics from GET /api/dashboard/admin/performance
   */
  async getExecutivePerformance(): Promise<ExecutivePerformance[]> {
    const response = await api.get<ApiResponse<ExecutivePerformance[]>>('/dashboard/admin/performance');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to retrieve executive performance metrics');
    }
    return response.data.data;
  },
};

export default dashboardService;
