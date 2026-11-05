import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context';
import { Role } from '@/types';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export interface RoleBasedRouteProps {
  allowedRoles: Role[];
  fallbackPath?: string;
  children?: React.ReactNode;
}

/**
 * Role-Based Route Guard.
 * Restricts UI routes to specific roles (ADMIN vs SALES_EXECUTIVE).
 * Note: Backend APIs enforce strict authorization independently.
 */
export const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({
  allowedRoles,
  fallbackPath,
  children,
}) => {
  const { user, role, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="text-center">
          <LoadingSpinner size={36} />
          <p className="mt-3 text-sm font-medium text-gray-500">
            Checking user permissions...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Check if current user's role is permitted
  const hasAccess = role && allowedRoles.includes(role);

  if (!hasAccess) {
    // If not authorized, redirect to appropriate role-specific home
    const defaultRedirect =
      role === Role.SALES_EXECUTIVE
        ? '/executive/dashboard'
        : '/admin/dashboard';

    return <Navigate to={fallbackPath || defaultRedirect} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default RoleBasedRoute;
