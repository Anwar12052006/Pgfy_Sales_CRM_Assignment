import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  UserMinus,
  PhoneCall,
  Clock,
  AlertTriangle,
  Plus,
  RefreshCw,
  ArrowRight,
  FileSpreadsheet,
  Award,
  PhoneIncoming,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  PageHeader,
  StatCard,
  StatusBadge,
  CallOutcomeBadge,
  LoadingSpinner,
  ErrorState,
  EmptyState,
} from '@/components/common';
import { dashboardService } from '@/services/dashboardService';
import { callService } from '@/services/callService';
import type { AdminDashboardData, Call } from '@/types';
import { LeadStatus } from '@/types';
import { formatDuration, formatDateTime } from '@/components/calls';

// Color palette for Lead Status chart
const STATUS_COLORS: Record<string, string> = {
  [LeadStatus.NEW]: '#3B82F6', // Blue
  [LeadStatus.CONTACTED]: '#06B6D4', // Cyan
  [LeadStatus.INTERESTED]: '#F59E0B', // Amber
  [LeadStatus.NOT_INTERESTED]: '#F43F5E', // Rose
  [LeadStatus.FOLLOW_UP]: '#A855F7', // Purple
  [LeadStatus.VISIT_SCHEDULED]: '#6366F1', // Indigo
  [LeadStatus.CONVERTED]: '#10B981', // Emerald
  [LeadStatus.LOST]: '#64748B', // Slate
};

const ASSIGNMENT_COLORS = ['#2563EB', '#F59E0B'];

const formatRate = (rate?: number | null): string => {
  if (rate === undefined || rate === null || isNaN(rate)) return '0%';
  return `${Number(rate).toFixed(1).replace(/\.0$/, '')}%`;
};

export const AdminOverviewPage: React.FC = () => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchDashboardData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [dashRes, callsRes] = await Promise.all([
        dashboardService.getAdminDashboard(),
        callService.getCalls({ limit: 5 }).catch(() => ({ data: [] })),
      ]);

      setData(dashRes);
      setRecentCalls(callsRes.data || []);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load dashboard metrics from backend.';
      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <LoadingSpinner size={40} />
        <p className="mt-4 text-sm font-medium text-gray-500">
          Loading live CRM metrics from database...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-8">
        <ErrorState
          title="Could not load dashboard metrics"
          message={error || 'An unexpected error occurred while communicating with /api/dashboard/admin.'}
          onRetry={() => fetchDashboardData()}
        />
      </div>
    );
  }

  // Format Status Breakdown for Recharts BarChart
  const statusChartData = Object.entries(data.leadStatusBreakdown || {}).map(
    ([statusKey, count]) => ({
      status: statusKey.replace(/_/g, ' '),
      count,
      key: statusKey,
    })
  );

  // Format Assignment Breakdown for Donut Chart
  const assignmentChartData = [
    { name: 'Assigned Leads', value: data.assignedLeads },
    { name: 'Unassigned Leads', value: data.unassignedLeads },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Admin Sales Dashboard"
        description="Real-time sales velocity, lead pipeline telemetry, and executive performance metrics"
        breadcrumbs={[
          { label: 'Admin', href: '/admin/overview' },
          { label: 'Dashboard' },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fetchDashboardData(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 focus:outline-none transition-colors"
              title="Refresh dashboard metrics"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-gray-500 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`}
              />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            <Link
              to="/admin/assign"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition-colors"
            >
              <UserCheck className="h-3.5 w-3.5 text-amber-600" />
              <span>Assign Queue ({data.unassignedLeads})</span>
            </Link>
            <Link
              to="/admin/reports"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition-colors"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Exports</span>
            </Link>
            <Link
              to="/admin/leads"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Lead</span>
            </Link>
          </div>
        }
      />

      {/* ── 1. Eight Core KPI Cards ─────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
          Core Pipeline Metrics
        </h2>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. Total Leads */}
          <StatCard
            title="Total Leads"
            value={data.totalLeads}
            icon={Users}
            variant="blue"
            subtitle="All registered prospects"
          />

          {/* 2. Assigned Leads */}
          <StatCard
            title="Assigned Leads"
            value={data.assignedLeads}
            icon={UserCheck}
            variant="indigo"
            subtitle={`${data.totalLeads > 0 ? Math.round((data.assignedLeads / data.totalLeads) * 100) : 0}% of total pipeline`}
          />

          {/* 3. Unassigned Leads */}
          <StatCard
            title="Unassigned Leads"
            value={data.unassignedLeads}
            icon={UserMinus}
            variant={data.unassignedLeads > 0 ? 'amber' : 'slate'}
            subtitle={data.unassignedLeads > 0 ? 'Action required in queue' : 'All leads assigned'}
          />

          {/* 4. Converted Leads */}
          <StatCard
            title="Converted Leads"
            value={data.convertedLeads}
            icon={Award}
            variant="emerald"
            subtitle={`${formatRate(data.conversionRate)} conversion rate`}
          />

          {/* 5. Total Calls */}
          <StatCard
            title="Total Calls"
            value={data.totalCalls}
            icon={PhoneCall}
            variant="purple"
            subtitle="Outbound customer dials"
          />

          {/* 6. Connected Calls */}
          <StatCard
            title="Connected Calls"
            value={data.connectedCalls}
            icon={PhoneIncoming}
            variant="blue"
            subtitle={`${formatRate(data.connectionRate)} connection rate`}
          />

          {/* 7. Pending Follow-ups */}
          <StatCard
            title="Pending Follow-ups"
            value={data.pendingFollowUps}
            icon={Clock}
            variant="amber"
            subtitle="Scheduled team callbacks"
          />

          {/* 8. Overdue Follow-ups */}
          <StatCard
            title="Overdue Follow-ups"
            value={data.overdueFollowUps}
            icon={AlertTriangle}
            variant={data.overdueFollowUps > 0 ? 'rose' : 'slate'}
            subtitle={data.overdueFollowUps > 0 ? 'Requires executive escalation' : 'Zero overdue tasks'}
          />
        </div>
      </div>

      {/* ── 2. Three Mandatory Rate Metrics ─────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Team Performance Metrics
          </h2>
          <span className="text-xs text-slate-400">Calculated live via PostgreSQL analytics</span>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* 1. Call Coverage Rate */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-800">
                Call Coverage Rate
              </span>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
                {formatRate(data.callCoverageRate)}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Unique assigned leads contacted during current assignment period.
            </p>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(data.callCoverageRate || 0, 100)}%` }}
              />
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
              <span>Formula: Contacted Leads / Assigned Leads</span>
              <span>Target: 100%</span>
            </div>
          </div>

          {/* 2. Conversion Rate */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-800">
                Conversion Rate
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                {formatRate(data.conversionRate)}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Converted assigned leads out of total assigned prospects.
            </p>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((data.conversionRate || 0) * 4, 100)}%` }}
              />
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
              <span>{data.convertedLeads} converted bookings</span>
              <span>Benchmark: &gt; 15%</span>
            </div>
          </div>

          {/* 3. Connection Rate */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-800">
                Connection Rate
              </span>
              <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-700 border border-purple-200">
                {formatRate(data.connectionRate)}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Ratio of successfully answered customer calls over total placed calls.
            </p>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(data.connectionRate || 0, 100)}%` }}
              />
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
              <span>{data.connectedCalls} connected of {data.totalCalls} calls</span>
              <span>Target: &gt; 60%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Visual Charts & Follow-Up Overview ───────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Status Breakdown Bar Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-2">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Lead Status Distribution
              </h2>
              <p className="text-xs text-slate-500">
                Current volume of student & professional leads across all 8 pipeline stages
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              Total: {data.totalLeads}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={statusChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <XAxis
                  dataKey="status"
                  interval={0}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  angle={-25}
                  textAnchor="end"
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: '#F1F5F9' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-md text-xs">
                          <p className="font-semibold text-slate-900">{item.status}</p>
                          <p className="text-blue-600 font-bold mt-0.5">
                            {item.count} leads
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {statusChartData.map((entry) => (
                    <Cell
                      key={`cell-${entry.key}`}
                      fill={STATUS_COLORS[entry.key] || '#3B82F6'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Allocation & Follow-up Overview Widget */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-sm font-bold text-slate-900">
                Pipeline Allocation & Tasks
              </h2>
              <p className="text-xs text-slate-500">
                Assignment distribution and callback health
              </p>
            </div>

            {/* Donut Chart */}
            <div className="h-40 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assignmentChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {assignmentChartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={ASSIGNMENT_COLORS[index % ASSIGNMENT_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center pointer-events-none">
                <span className="text-lg font-bold text-slate-900 block leading-tight">
                  {data.totalLeads}
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Total
                </span>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-around text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                <span className="text-slate-600">Assigned: {data.assignedLeads}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-600">Unassigned: {data.unassignedLeads}</span>
              </div>
            </div>
          </div>

          {/* Follow-up Overview Widget */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-slate-700">Follow-Up Agenda</span>
              <Link to="/admin/follow-ups" className="text-blue-600 hover:underline">
                View all &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-100">
                <span className="block font-bold text-amber-800 text-sm">{data.pendingFollowUps}</span>
                <span className="text-[11px] text-amber-700">Pending</span>
              </div>
              <div className={`p-2 rounded-lg border ${data.overdueFollowUps > 0 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                <span className={`block font-bold text-sm ${data.overdueFollowUps > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                  {data.overdueFollowUps}
                </span>
                <span className={`text-[11px] ${data.overdueFollowUps > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                  Overdue
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Executive Performance Section ────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Executive Performance & Call Coverage
            </h2>
            <p className="text-xs text-slate-500">
              Individual sales executive workload, dial volume, and conversion benchmarks
            </p>
          </div>
          <Link
            to="/admin/performance"
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            <span>Full Leaderboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {(!data.executivePerformance || data.executivePerformance.length === 0) ? (
          <EmptyState
            title="No active sales executives found"
            description="Active sales executive accounts will populate here once registered in the system."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Executive Name
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">
                    Assigned Leads
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">
                    Contacted Leads
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">
                    Converted Leads
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">
                    Total Calls
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">
                    Connected Calls
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">
                    Coverage Rate
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">
                    Conversion Rate
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">
                    Connection Rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {data.executivePerformance.map((exec) => (
                  <tr key={exec.executiveId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-slate-900 whitespace-nowrap">
                      {exec.executiveName}
                    </td>
                    <td className="px-4 py-3.5 text-center font-medium text-slate-800">
                      {exec.assignedLeads}
                    </td>
                    <td className="px-4 py-3.5 text-center text-slate-600">
                      {exec.leadsContacted}
                    </td>
                    <td className="px-4 py-3.5 text-center font-semibold text-emerald-600">
                      {exec.convertedLeads}
                    </td>
                    <td className="px-4 py-3.5 text-center text-slate-600">
                      {exec.totalCalls}
                    </td>
                    <td className="px-4 py-3.5 text-center text-slate-600">
                      {exec.connectedCalls}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          exec.callCoverageRate >= 80
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : exec.callCoverageRate >= 50
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {formatRate(exec.callCoverageRate)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          exec.conversionRate > 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {formatRate(exec.conversionRate)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center text-xs text-slate-600 font-medium">
                      {formatRate(exec.connectionRate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 5. Recent Calls & Recent Leads Grid ──────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Call Activity */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="border-b border-slate-100 p-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Recent Call Activity
              </h2>
              <p className="text-xs text-slate-500">
                Latest customer interaction logs and outcomes
              </p>
            </div>
            <Link
              to="/admin/calls"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              <span>View All Calls</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentCalls.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No recent call activity logged yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentCalls.map((call) => (
                <div key={call.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-900">
                        {call.lead?.customerName || 'Prospect'}
                      </span>
                      <CallOutcomeBadge outcome={call.outcome} size="sm" />
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span>Logged by: <strong className="text-slate-700">{call.executive?.name || 'Executive'}</strong></span>
                      <span>&bull;</span>
                      <span>Duration: {formatDuration(call.durationSeconds)}</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">
                    {formatDateTime(call.callDateTime)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Registered Enquiries */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="border-b border-slate-100 p-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Recently Registered Enquiries
              </h2>
              <p className="text-xs text-slate-500">
                Latest student & tenant enquiries from Bengaluru
              </p>
            </div>
            <Link
              to="/admin/leads"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              <span>View All Leads</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {data.recentLeads.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No leads currently registered in database.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recentLeads.slice(0, 5).map((lead) => (
                <div key={lead.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-900">
                        {lead.customerName}
                      </span>
                      <StatusBadge status={lead.status} size="sm" />
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {lead.propertyCategory} &bull; {lead.preferredLocation} &bull; ₹{Number(lead.budget).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="text-right text-[11px]">
                    <span className="block text-slate-700 font-medium">
                      {lead.assignedExecutive ? lead.assignedExecutive.name : 'Unassigned'}
                    </span>
                    <span className="text-slate-400">
                      {new Date(lead.enquiryDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminOverviewPage;
