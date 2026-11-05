import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context';
import { AuthLayout, DashboardLayout } from '@/layouts';
import { Login } from '@/pages/auth';
import { ProtectedRoute, RoleBasedRoute } from '@/components/auth';
import { Role } from '@/types';
import {
  AdminOverviewPage,
  AdminLeadsPage,
  AdminAssignPage,
  AdminCallsPage,
  AdminFollowUpsPage,
  AdminPerformancePage,
  AdminReportsPage,
} from '@/pages/admin';
import {
  ExecutiveDashboardPage,
  ExecutiveLeadsPage,
  ExecutiveLeadDetailPage,
  ExecutiveCallsPage,
  ExecutiveFollowUpsPage,
} from '@/pages/executive';

/**
 * Root Home Redirection based on active authentication and user role
 */
function RootRedirect() {
  const { isAuthenticated, role, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return role === Role.ADMIN ? (
    <Navigate to="/admin/dashboard" replace />
  ) : (
    <Navigate to="/executive/dashboard" replace />
  );
}

/**
 * Public route guard: redirects already logged-in users away from /login
 */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, role, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return role === Role.ADMIN ? (
      <Navigate to="/admin/dashboard" replace />
    ) : (
      <Navigate to="/executive/dashboard" replace />
    );
  }

  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Public Auth Routes ───────────────────────────────── */}
          <Route element={<AuthLayout />}>
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
          </Route>

          {/* ── Protected CRM Workspace ───────────────────────────── */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              {/* Admin Routes (Restricted to ADMIN role) */}
              <Route element={<RoleBasedRoute allowedRoles={[Role.ADMIN]} />}>
                <Route path="/admin/overview" element={<AdminOverviewPage />} />
                <Route path="/admin/dashboard" element={<AdminOverviewPage />} />
                <Route path="/admin/leads" element={<AdminLeadsPage />} />
                <Route path="/admin/assign" element={<AdminAssignPage />} />
                <Route path="/admin/calls" element={<AdminCallsPage />} />
                <Route path="/admin/follow-ups" element={<AdminFollowUpsPage />} />
                <Route path="/admin/performance" element={<AdminPerformancePage />} />
                <Route path="/admin/reports" element={<AdminReportsPage />} />

                {/* Legacy / convenient redirects */}
                <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/leads" element={<Navigate to="/admin/leads" replace />} />
                <Route path="/calls" element={<Navigate to="/admin/calls" replace />} />
                <Route path="/reports" element={<Navigate to="/admin/reports" replace />} />
              </Route>

              {/* Executive Routes (Restricted to SALES_EXECUTIVE & ADMIN) */}
              <Route
                element={
                  <RoleBasedRoute
                    allowedRoles={[Role.SALES_EXECUTIVE, Role.ADMIN]}
                  />
                }
              >
                <Route
                  path="/executive/dashboard"
                  element={<ExecutiveDashboardPage />}
                />
                <Route
                  path="/executive/leads"
                  element={<ExecutiveLeadsPage />}
                />
                <Route
                  path="/executive/leads/:id"
                  element={<ExecutiveLeadDetailPage />}
                />
                <Route
                  path="/executive/calls"
                  element={<ExecutiveCallsPage />}
                />
                <Route
                  path="/executive/follow-ups"
                  element={<ExecutiveFollowUpsPage />}
                />
              </Route>
            </Route>
          </Route>

          {/* ── Root & Fallback Routing ───────────────────────────── */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
