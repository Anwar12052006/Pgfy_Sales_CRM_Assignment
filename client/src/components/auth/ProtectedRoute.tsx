import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export interface ProtectedRouteProps {
  children?: React.ReactNode;
}

/**
 * Route guard that ensures user is authenticated with a valid JWT token.
 * Unauthenticated users are redirected to /login with return location preserved.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="text-center">
          <LoadingSpinner size={36} />
          <p className="mt-3 text-sm font-medium text-gray-500">
            Verifying authentication session...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
