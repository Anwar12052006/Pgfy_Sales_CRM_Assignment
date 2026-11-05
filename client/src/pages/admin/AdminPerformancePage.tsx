import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Award,
  PhoneCall,
  Users,
  RefreshCw,
} from 'lucide-react';
import {
  PageHeader,
  StatCard,
  DataTable,
  LoadingSpinner,
  ErrorState,
} from '@/components/common';
import { dashboardService } from '@/services/dashboardService';
import type { Column, ExecutivePerformance } from '@/types';

const formatRate = (rate?: number | null): string => {
  if (rate === undefined || rate === null || isNaN(rate)) return '0%';
  return `${Number(rate).toFixed(1).replace(/\.0$/, '')}%`;
};

export const AdminPerformancePage: React.FC = () => {
  const [performanceData, setPerformanceData] = useState<ExecutivePerformance[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchPerformance = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await dashboardService.getExecutivePerformance();
      setPerformanceData(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to retrieve executive performance metrics';
      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  // Aggregate stats across team
  const totalExecutives = performanceData.length;
  const totalTeamCalls = performanceData.reduce((acc, curr) => acc + curr.totalCalls, 0);
  const totalConverted = performanceData.reduce((acc, curr) => acc + curr.convertedLeads, 0);
  const totalAssigned = performanceData.reduce((acc, curr) => acc + curr.assignedLeads, 0);
  const avgTeamConversionRate =
    totalAssigned > 0 ? Math.round((totalConverted / totalAssigned) * 1000) / 10 : 0;

  const columns: Column<ExecutivePerformance>[] = [
    {
      header: 'Sales Executive',
      accessorKey: 'executiveName',
      render: (exec) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
            {exec.executiveName.charAt(0)}
          </div>
          <span className="font-semibold text-slate-900">{exec.executiveName}</span>
        </div>
      ),
    },
    {
      header: 'Assigned Leads',
      accessorKey: 'assignedLeads',
      render: (exec) => <span className="font-medium text-slate-800">{exec.assignedLeads}</span>,
    },
    {
      header: 'Contacted Leads',
      accessorKey: 'leadsContacted',
      render: (exec) => <span className="text-slate-600">{exec.leadsContacted}</span>,
    },
    {
      header: 'Converted',
      accessorKey: 'convertedLeads',
      render: (exec) => (
        <span className="font-bold text-emerald-600">{exec.convertedLeads}</span>
      ),
    },
    {
      header: 'Total Calls',
      accessorKey: 'totalCalls',
      render: (exec) => <span className="text-slate-700">{exec.totalCalls}</span>,
    },
    {
      header: 'Connected Calls',
      accessorKey: 'connectedCalls',
      render: (exec) => <span className="text-slate-700">{exec.connectedCalls}</span>,
    },
    {
      header: 'Coverage Rate',
      accessorKey: 'callCoverageRate',
      render: (exec) => (
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
      ),
    },
    {
      header: 'Conversion Win Rate',
      accessorKey: 'conversionRate',
      render: (exec) => (
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
            exec.conversionRate > 0
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {formatRate(exec.conversionRate)}
        </span>
      ),
    },
    {
      header: 'Connection Rate',
      accessorKey: 'connectionRate',
      render: (exec) => (
        <span className="text-xs font-semibold text-purple-700">
          {formatRate(exec.connectionRate)}
        </span>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <LoadingSpinner size={40} />
        <p className="mt-4 text-sm font-medium text-slate-500">
          Compiling team sales performance metrics...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <ErrorState
          title="Could not load performance leaderboard"
          message={error}
          onRetry={() => fetchPerformance()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Executive Performance Leaderboard"
        description="Comprehensive productivity benchmarks, outbound dial coverage, and booking conversion metrics across Bengaluru sales executives."
        breadcrumbs={[
          { label: 'Admin', href: '/admin/overview' },
          { label: 'Sales Performance' },
        ]}
        actions={
          <button
            type="button"
            onClick={() => fetchPerformance(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Metrics</span>
          </button>
        }
      />

      {/* Team Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Executives"
          value={totalExecutives}
          icon={Users}
          variant="blue"
          subtitle="Registered sales executives"
        />
        <StatCard
          title="Total Outbound Dials"
          value={totalTeamCalls}
          icon={PhoneCall}
          variant="purple"
          subtitle="Cumulative logged calls"
        />
        <StatCard
          title="Converted Bookings"
          value={totalConverted}
          icon={Award}
          variant="emerald"
          subtitle="Successful tenant conversions"
        />
        <StatCard
          title="Team Win Rate"
          value={`${avgTeamConversionRate}%`}
          icon={TrendingUp}
          variant="indigo"
          subtitle="Average conversion ratio"
        />
      </div>

      {/* Leaderboard Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Executive Leaderboard & Ratios
            </h2>
            <p className="text-xs text-slate-500">
              Live benchmarks calculated dynamically from call tracking and lead assignments
            </p>
          </div>
          <span className="text-xs text-slate-400">Strictly computed via PostgreSQL</span>
        </div>

        <DataTable
          columns={columns}
          data={performanceData}
          keyExtractor={(item) => item.executiveId}
          isLoading={false}
          emptyTitle="No sales executives registered"
          emptyDescription="Once active sales executive accounts are created, their benchmarks will populate here."
        />
      </div>
    </div>
  );
};

export default AdminPerformancePage;
