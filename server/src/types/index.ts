import { Role } from '../config/prisma.js';

export { Role };

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** JWT payload encoded into access tokens */
export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
}

/** Sanitized user object without sensitive fields (e.g. password) */
export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** User structure stored in Express Request object */
export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
}
