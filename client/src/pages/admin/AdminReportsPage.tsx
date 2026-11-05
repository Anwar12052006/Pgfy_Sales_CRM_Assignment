import React, { useState } from 'react';
import {
  Download,
  Users,
  PhoneCall,
  Award,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  FileText,
  Clock,
  Sparkles,
  RefreshCw,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/common';
import { reportService, extractReportErrorMessage } from '@/services/reportService';

type ReportKey = 'leads' | 'calls' | 'performance';

interface ReportConfig {
  key: ReportKey;
  title: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: {
    bg: string;
    border: string;
    iconBg: string;
    iconText: string;
    badgeBg: string;
    badgeText: string;
    btnBg: string;
  };
  endpoint: string;
  description: string;
  columnsList: string[];
  estimatedRowsNote: string;
}

const REPORT_CONFIGS: ReportConfig[] = [
  {
    key: 'leads',
    title: 'All Leads Report',
    badge: 'CRM Pipeline Audit',
    icon: Users,
    accentColor: {
      bg: 'bg-blue-50/40',
      border: 'border-blue-200/80',
      iconBg: 'bg-blue-100 text-blue-700',
      iconText: 'text-blue-600',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
      badgeText: 'text-blue-700',
      btnBg: 'bg-blue-600 hover:bg-blue-700',
    },
    endpoint: 'GET /api/reports/leads',
    description:
      'Export a complete master ledger of all registered prospective tenants, contact coordinates, preferred locations, budgets in INR, acquisition channels, assigned executives, and lifecycle statuses.',
    columnsList: [
      'Lead ID',
      'Customer Name',
      'Mobile Number',
      'Email',
      'Property Category',
      'Preferred Location',
      'Budget INR',
      'Lead Source',
      'Lead Status',
      'Assigned Executive',
      'Enquiry Date',
      'Created Date',
    ],
    estimatedRowsNote: 'All active, unassigned, and converted prospects in database',
  },
  {
    key: 'calls',
    title: 'Call History Report',
    badge: 'Outbound Interaction Audit',
    icon: PhoneCall,
    accentColor: {
      bg: 'bg-purple-50/40',
      border: 'border-purple-200/80',
      iconBg: 'bg-purple-100 text-purple-700',
      iconText: 'text-purple-600',
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
      badgeText: 'text-purple-700',
      btnBg: 'bg-purple-600 hover:bg-purple-700',
    },
    endpoint: 'GET /api/reports/calls',
    description:
      'Export complete chronological logs of outbound telephone interactions, dial durations, call outcomes (Connected, Busy, Visit Scheduled, etc.), notes, executive names, and scheduled callback dates.',
    columnsList: [
      'Call ID',
      'Customer Name',
      'Customer Mobile',
      'Executive Name',
      'Call Date & Time',
      'Duration (Seconds)',
      'Call Outcome',
      'Discussion Notes',
      'Next Follow-up Date',
    ],
    estimatedRowsNote: 'Every logged dial attempt across all sales executives',
  },
  {
    key: 'performance',
    title: 'Sales Executive Performance Report',
    badge: 'Executive Leaderboard & Ratios',
    icon: Award,
    accentColor: {
      bg: 'bg-emerald-50/40',
      border: 'border-emerald-200/80',
      iconBg: 'bg-emerald-100 text-emerald-700',
      iconText: 'text-emerald-600',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badgeText: 'text-emerald-700',
      btnBg: 'bg-emerald-600 hover:bg-emerald-700',
    },
    endpoint: 'GET /api/reports/performance',
    description:
      'Export comprehensive productivity benchmarks per sales executive, including workload capacity, unique leads contacted, conversion counts, dial coverage, and connection percentages.',
    columnsList: [
      'Executive Name',
      'Assigned Leads',
      'Unique Leads Contacted',
      'Converted Leads',
      'Total Calls Made',
      'Connected Calls',
      'Pending Follow-ups',
      'Overdue Follow-ups',
      'Call Coverage Rate (%)',
      'Conversion Rate (%)',
      'Connection Rate (%)',
    ],
    estimatedRowsNote: 'All registered active executives with computed KPI ratios',
  },
];

export const AdminReportsPage: React.FC = () => {
  // Loading state per report key to prevent duplicate concurrent downloads
  const [downloadingKey, setDownloadingKey] = useState<ReportKey | null>(null);

  // Success notification message & error message per report
  const [successInfo, setSuccessInfo] = useState<{
    key: ReportKey;
    filename: string;
    timestamp: Date;
  } | null>(null);

  const [errorInfo, setErrorInfo] = useState<{
    key: ReportKey;
    message: string;
  } | null>(null);

  const handleDownload = async (key: ReportKey) => {
    if (downloadingKey !== null) return; // Prevent duplicate triggers

    setDownloadingKey(key);
    setErrorInfo(null);

    try {
      let downloadedFilename = '';

      if (key === 'leads') {
        downloadedFilename = await reportService.downloadLeadsReport();
      } else if (key === 'calls') {
        downloadedFilename = await reportService.downloadCallsReport();
      } else if (key === 'performance') {
        downloadedFilename = await reportService.downloadPerformanceReport();
      }

      setSuccessInfo({
        key,
        filename: downloadedFilename,
        timestamp: new Date(),
      });
    } catch (err: unknown) {
      const errorMsg = await extractReportErrorMessage(err);
      setErrorInfo({
        key,
        message: errorMsg,
      });
    } finally {
      setDownloadingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── 1. Page Header ─────────────────────────────────────────── */}
      <PageHeader
        title="Reports & CSV Data Exports"
        description="Download audit-ready CSV reports streamed directly from PostgreSQL. Restricted strictly to system administrators."
        breadcrumbs={[
          { label: 'Admin', href: '/admin/overview' },
          { label: 'Reports' },
        ]}
      />

      {/* ── 2. Information & Compliance Banner ──────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600 border border-blue-100 shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  Secure Enterprise Reporting Architecture
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  <Sparkles className="h-3 w-3" />
                  RFC 4180 & UTF-8 BOM
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 max-w-2xl">
                Generated files start with the UTF-8 Byte Order Mark (<code className="rounded bg-slate-100 px-1 py-0.5 text-slate-700 font-mono text-[11px]">\uFEFF</code>)
                for instant double-click compatibility in Microsoft Excel and Google Sheets without corrupted accents or symbols.
                Formula injection safeguards automatically neutralize malicious spreadsheet characters (<code className="text-slate-700 font-mono text-[11px]">= + - @</code>).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
            <Clock className="h-4 w-4 text-slate-400" />
            <span>Timezone: Asia/Kolkata (IST)</span>
          </div>
        </div>
      </div>

      {/* ── 3. Global Notification Banners (Success & Error) ────────── */}
      {successInfo && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-100 p-1 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-emerald-900">
                Report Downloaded Successfully!
              </span>
              <p className="text-emerald-700 mt-0.5">
                Saved as <code className="font-semibold underline">{successInfo.filename}</code> at{' '}
                {successInfo.timestamp.toLocaleTimeString('en-IN')}.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSuccessInfo(null)}
            className="rounded-md p-1 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-900 transition-colors"
            title="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {errorInfo && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-xs shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-rose-100 p-1 text-rose-700">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-rose-900">
                Report Download Failed
              </span>
              <p className="text-rose-700 mt-0.5">{errorInfo.message}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleDownload(errorInfo.key)}
              className="inline-flex items-center gap-1 rounded bg-rose-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-800 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Retry</span>
            </button>
            <button
              type="button"
              onClick={() => setErrorInfo(null)}
              className="rounded-md p-1 text-rose-600 hover:bg-rose-100 hover:text-rose-900 transition-colors"
              title="Dismiss alert"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── 4. Three Dedicated Report Sections ──────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {REPORT_CONFIGS.map((report) => {
          const Icon = report.icon;
          const isThisLoading = downloadingKey === report.key;
          const isAnyLoading = downloadingKey !== null;

          return (
            <div
              key={report.key}
              className={`flex flex-col justify-between rounded-xl border bg-white p-6 shadow-xs transition-all hover:shadow-md ${report.accentColor.border}`}
            >
              {/* Top Details */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`rounded-xl p-3 ${report.accentColor.iconBg}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${report.accentColor.badgeBg}`}
                  >
                    {report.badge}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  {report.title}
                </h3>

                <p className="mt-2 text-xs text-slate-600 leading-relaxed min-h-[4rem]">
                  {report.description}
                </p>

                {/* API Endpoint Badge */}
                <div className="mt-3 flex items-center gap-1.5 text-[11px] font-mono text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                  <FileText className="h-3 w-3 text-slate-400" />
                  <span>{report.endpoint}</span>
                </div>

                {/* Included Fields Chips */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Fields Included ({report.columnsList.length} Columns):
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {report.columnsList.map((col) => (
                      <span
                        key={col}
                        className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200/60"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Actions & Download Button */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="mb-3 text-[11px] text-slate-400 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <span>{report.estimatedRowsNote}</span>
                </div>

                <button
                  type="button"
                  id={`btn-download-${report.key}`}
                  onClick={() => handleDownload(report.key)}
                  disabled={isAnyLoading}
                  className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 px-4 text-xs font-bold text-white shadow-xs transition-all ${
                    isThisLoading
                      ? 'bg-slate-400 cursor-not-allowed'
                      : isAnyLoading
                      ? 'bg-slate-300 cursor-not-allowed'
                      : `${report.accentColor.btnBg} cursor-pointer active:scale-[0.98]`
                  }`}
                >
                  {isThisLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-white" />
                      <span>Generating & Downloading CSV...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>Download CSV</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 5. CSV Specification & Export Guide ─────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Export Guide & System Compatibility
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs text-slate-600">
          <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-100">
            <span className="font-bold text-slate-800 block mb-1">
              📊 Real-Time Database Streaming
            </span>
            <span>
              All reports are compiled dynamically from live PostgreSQL tables with zero mocked or cached values.
            </span>
          </div>

          <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-100">
            <span className="font-bold text-slate-800 block mb-1">
              🔒 Admin-Only Authorization
            </span>
            <span>
              Backend routes require valid JWT tokens with Role.ADMIN. Requests from Sales Executive credentials are rejected with HTTP 403.
            </span>
          </div>

          <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-100">
            <span className="font-bold text-slate-800 block mb-1">
              💻 Native Browser File Download
            </span>
            <span>
              Utilizes Blob streaming and native browser object URLs with Content-Disposition headers for seamless downloads.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReportsPage;
