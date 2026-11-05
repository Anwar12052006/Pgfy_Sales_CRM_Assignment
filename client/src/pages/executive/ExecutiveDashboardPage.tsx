import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  PhoneCall,
  Clock,
  AlertTriangle,
  Award,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Calendar,
  History,
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
} from 'recharts';
import {
  StatCard,
  StatusBadge,
  CallOutcomeBadge,
  LoadingSpinner,
  ErrorState,
  EmptyState,
} from '@/components/common';
import { dashboardService } from '@/services/dashboardService';
import { callService } from '@/services/callService';
import { followUpService } from '@/services/followUpService';
import type { ExecutiveDashboardData, Call } from '@/types';
import { LeadStatus } from '@/types';
import { formatDuration, formatDateTime } from '@/components/calls';

// Consistent color palette matching Admin pipeline
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

const formatRate = (rate?: number | null): string => {
  if (rate === undefined || rate === null || isNaN(rate)) return '0%';
  return `${Number(rate).toFixed(1).replace(/\.0$/, '')}%`;
};

export const ExecutiveDashboardPage: React.FC = () => {
  const [data, setData] = useState<ExecutiveDashboardData | null>(null);
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [todayFollowUpCount, setTodayFollowUpCount] = useState<number>(0);
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
      const [dashRes, callsRes, todayFuRes] = await Promise.all([
        dashboardService.getExecutiveDashboard(),
        callService.getCalls({ limit: 5 }).catch(() => ({ data: [] })),
        followUpService
          .getFollowUps({ classification: 'today', status: 'PENDING', limit: 1 })
          .catch(() => ({ pagination: { total: 0 } })),
      ]);

      setData(dashRes);
      setRecentCalls(callsRes.data || []);
      setTodayFollowUpCount(todayFuRes.pagination?.total || 0);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load executive dashboard metrics.';
      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Lead status breakdown chart data formatted cleanly
  const statusChartData = useMemo(() => {
    if (!data?.leadStatusBreakdown) {
      // Fallback: derive from recentLeads or empty
      const counts: Record<string, number> = {};
      Object.values(LeadStatus).forEach((status) => {
        counts[status] = 0;
      });
      data?.recentLeads.forEach((lead) => {
        if (counts[lead.status] !== undefined) {
          counts[lead.status]++;
        }
      });
      return Object.entries(counts).map(([status, count]) => ({
        status: status.replace(/_/g, ' '),
        count,
        key: status,
      }));
    }

    return Object.entries(data.leadStatusBreakdown).map(([status, count]) => ({
      status: status.replace(/_/g, ' '),
      count,
      key: status,
    }));
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <LoadingSpinner size={40} />
        <p className="mt-4 text-sm font-medium text-slate-500">
          Loading your personalized sales pipeline...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-8">
        <ErrorState
          title="Could not load your dashboard"
          message={error || 'An unexpected error occurred while communicating with /api/dashboard/executive.'}
          onRetry={() => fetchDashboardData()}
        />
      </div>
    );
  }

  const upcomingFollowUpCount = Math.max(
    0,
    data.pendingFollowUps - todayFollowUpCount - data.overdueFollowUps
  );

  return (
    <div className="space-y-6">
      {/* ── 1. Welcome Message & Quick Actions ───────────────────────── */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 p-6 text-white shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-xs text-blue-100">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>Sales Executive Portal &middot; Bengaluru Region</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
              Welcome back, {data.executiveName}
            </h1>
            <p className="mt-1 text-xs text-blue-100 max-w-xl">
              You have {data.assignedLeads} customer leads assigned to your active queue.
              Contact prospective tenants promptly and track your follow-up agenda.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fetchDashboardData(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20 focus:outline-none transition-colors"
              title="Refresh your metrics"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            <Link
              to="/executive/leads"
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-blue-700 shadow-sm hover:bg-blue-50 transition-colors"
            >
              <Users className="h-3.5 w-3.5 text-blue-600" />
              <span>View My Leads ({data.assignedLeads})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── 2. Six Primary Executive KPI Cards ──────────────────────── */}
      <div>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
          Personal Pipeline Overview
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {/* 1. My Assigned Leads */}
          <StatCard
            title="My Assigned Leads"
            value={data.assignedLeads}
            icon={Users}
            variant="blue"
            subtitle="In your active queue"
          />

          {/* 2. Leads Contacted */}
          <StatCard
            title="Leads Contacted"
            value={data.leadsContacted}
            icon={UserCheck}
            variant="indigo"
            subtitle={`${Math.max(0, data.assignedLeads - data.leadsContacted)} not yet contacted`}
          />

          {/* 3. Total Calls */}
          <StatCard
            title="Total Calls"
            value={data.totalCalls}
            icon={PhoneCall}
            variant="purple"
            subtitle={`${data.connectedCalls} connected calls`}
          />

          {/* 4. Pending Follow-ups */}
          <StatCard
            title="Pending Follow-ups"
            value={data.pendingFollowUps}
            icon={Clock}
            variant="amber"
            subtitle="Scheduled callbacks"
          />

          {/* 5. Overdue Follow-ups */}
          <StatCard
            title="Overdue Follow-ups"
            value={data.overdueFollowUps}
            icon={AlertTriangle}
            variant={data.overdueFollowUps > 0 ? 'rose' : 'slate'}
            subtitle={
              data.overdueFollowUps > 0
                ? 'Requires urgent action'
                : 'All follow-ups on time'
            }
          />

          {/* 6. Converted Leads */}
          <StatCard
            title="Converted Leads"
            value={data.convertedLeads}
            icon={Award}
            variant="emerald"
            subtitle={`${formatRate(data.conversionRate)} conversion rate`}
          />
        </div>
      </div>

      {/* ── 3. Three Mandatory Telemetry Rate Metrics ─────────────────── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Mandatory Performance Telemetry
          </h2>
          <span className="text-xs text-slate-400">Strictly scoped to your assigned leads & calls</span>
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
              Percentage of your assigned customer leads who have been contacted via outbound calls.
            </p>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(data.callCoverageRate || 0, 100)}%` }}
              />
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
              <span>{data.leadsContacted} of {data.assignedLeads} leads contacted</span>
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
              Proportion of your assigned customer enquiries successfully converted to bookings.
            </p>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((data.conversionRate || 0) * 5, 100)}%` }}
              />
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
              <span>{data.convertedLeads} of {data.assignedLeads} leads converted</span>
              <span>Target: &gt; 15%</span>
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
              Percentage of placed outbound calls that successfully reached prospective tenants.
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

      {/* ── 4. Visualizations: Lead Status Chart & Follow-up Overview ─── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Simple Lead Status Distribution Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-2">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                My Lead Status Distribution
              </h2>
              <p className="text-xs text-slate-500">
                Breakdown of your active prospects across all lifecycle stages
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              Total: {data.assignedLeads}
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

        {/* Follow-up Overview Widget */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Follow-Up Overview
                </h2>
                <p className="text-xs text-slate-500">
                  Actionable callback schedule
                </p>
              </div>
              <Calendar className="h-4 w-4 text-slate-400" />
            </div>

            <p className="text-xs text-slate-600 mb-4">
              Timely follow-ups are proven to double conversion likelihood. Keep your schedule clear of overdue callbacks.
            </p>

            <div className="space-y-3">
              {/* Today */}
              <Link
                to="/executive/follow-ups?tab=today"
                className="flex items-center justify-between p-3 rounded-lg bg-blue-50/70 border border-blue-100 hover:bg-blue-100/70 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-600" />
                  <span className="text-xs font-semibold text-blue-900">Today's Follow-ups</span>
                </div>
                <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
                  {todayFollowUpCount}
                </span>
              </Link>

              {/* Upcoming */}
              <Link
                to="/executive/follow-ups?tab=upcoming"
                className="flex items-center justify-between p-3 rounded-lg bg-indigo-50/70 border border-indigo-100 hover:bg-indigo-100/70 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-indigo-600" />
                  <span className="text-xs font-semibold text-indigo-900">Upcoming Follow-ups</span>
                </div>
                <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white">
                  {upcomingFollowUpCount}
                </span>
              </Link>

              {/* Overdue */}
              <Link
                to="/executive/follow-ups?tab=overdue"
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  data.overdueFollowUps > 0
                    ? 'bg-rose-50/70 border-rose-200 hover:bg-rose-100/70'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      data.overdueFollowUps > 0 ? 'bg-rose-600' : 'bg-slate-400'
                    }`}
                  />
                  <span
                    className={`text-xs font-semibold ${
                      data.overdueFollowUps > 0 ? 'text-rose-900' : 'text-slate-700'
                    }`}
                  >
                    Overdue Follow-ups
                  </span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    data.overdueFollowUps > 0
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {data.overdueFollowUps}
                </span>
              </Link>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <Link
              to="/executive/follow-ups"
              className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-slate-900 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors"
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Open Follow-Up Manager &rarr;</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── 5. Activity Sections: Recent Calls & Recent Leads ────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Call Activity */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="border-b border-slate-100 p-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Recent Call Activity
              </h2>
              <p className="text-xs text-slate-500">
                Your latest outbound tenant interaction logs
              </p>
            </div>
            <Link
              to="/executive/calls"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              <span>View All Calls</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentCalls.length === 0 ? (
            <div className="p-8 text-center">
              <History className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              <p className="text-xs font-medium text-slate-600">No calls logged yet</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Start logging outbound calls directly from your leads table.
              </p>
              <Link
                to="/executive/leads"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
              >
                <PhoneCall className="h-3 w-3" />
                <span>Go to My Leads</span>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentCalls.map((call) => (
                <div
                  key={call.id}
                  className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-900 truncate">
                        {call.lead?.customerName || 'Customer Prospect'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        ({call.lead?.mobileNumber || '—'})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <PhoneIncoming className="h-3 w-3 text-slate-400" />
                        {formatDuration(call.durationSeconds)}
                      </span>
                      <span>&middot;</span>
                      <span>{formatDateTime(call.callDateTime)}</span>
                    </div>
                    {call.notes && (
                      <p className="text-[11px] text-slate-600 italic line-clamp-1">
                        "{call.notes}"
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    <CallOutcomeBadge outcome={call.outcome} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Assigned Leads */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="border-b border-slate-100 p-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Recent Assigned Leads
              </h2>
              <p className="text-xs text-slate-500">
                Latest customer enquiries allocated to your queue
              </p>
            </div>
            <Link
              to="/executive/leads"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              <span>View All Leads</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {data.recentLeads.length === 0 ? (
            <EmptyState
              title="No leads assigned to your queue"
              description="When incoming student and professional leads are allocated to your profile by the admin, they will appear here."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-900">
                        {lead.customerName}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        ({lead.mobileNumber})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      <span>{lead.propertyCategory}</span>
                      <span> &middot; </span>
                      <span>{lead.preferredLocation}</span>
                      <span> &middot; </span>
                      <span className="font-medium text-slate-800">
                        ₹{Number(lead.budget).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={lead.status} size="sm" />
                    <Link
                      to="/executive/leads"
                      className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      <PhoneCall className="h-3 w-3" />
                      <span>Contact</span>
                    </Link>
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

export default ExecutiveDashboardPage;
