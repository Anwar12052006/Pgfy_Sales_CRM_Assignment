import { api } from './api';
import type { ApiResponse, AuthResponse, LoginCredentials, User } from '@/types';

/**
 * Authentication Service connecting to the Express backend
 */
export const authService = {
  /**
   * Authenticate user with email and password
   * POST /api/auth/login
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Login failed');
    }
    return response.data.data;
  },

  /**
   * Retrieve current authenticated user profile using active JWT
   * GET /api/auth/me
   */
  async getMe(): Promise<User> {
    const response = await api.get<ApiResponse<User>>('/auth/me');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch user profile');
    }
    return response.data.data;
  },

  /**
   * Local session logout
   */
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

export default authService;
