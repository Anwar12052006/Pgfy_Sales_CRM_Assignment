import { api } from './api';

/**
 * Triggers a native browser file download using Blob and URL.createObjectURL.
 * Extracts the suggested filename from Content-Disposition header if present.
 */
function triggerBrowserDownload(
  blobData: BlobPart,
  defaultFilename: string,
  contentDisposition?: string
): string {
  let filename = defaultFilename;
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^";]+)"?/i);
    if (match?.[1]) {
      filename = match[1].trim();
    }
  }

  const blob = new Blob([blobData], { type: 'text/csv;charset=utf-8;' });
  const downloadUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.setAttribute('download', filename);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(downloadUrl);

  return filename;
}

/**
 * Extract human-readable error messages from Axios responses,
 * safely handling Blob responses for 401, 403 and 500 statuses.
 */
export async function extractReportErrorMessage(err: unknown): Promise<string> {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const response = (err as { response?: { status?: number; data?: unknown } }).response;
    if (response) {
      if (response.status === 401) {
        return 'Authentication required. Your session may have expired.';
      }
      if (response.status === 403) {
        return 'Access denied. Report downloads are strictly restricted to administrators.';
      }
      if (response.data instanceof Blob) {
        try {
          const rawText = await response.data.text();
          const parsed = JSON.parse(rawText);
          if (parsed && typeof parsed.message === 'string') {
            return parsed.message;
          }
        } catch {
          // If not JSON, text may be empty or HTML error
        }
      }
    }
  }

  return err instanceof Error ? err.message : 'An unexpected error occurred while downloading the report.';
}

export const reportService = {
  /**
   * Download All Leads CSV Report (Admin Only)
   * GET /api/reports/leads
   */
  async downloadLeadsReport(): Promise<string> {
    const today = new Date().toISOString().split('T')[0];
    const defaultFilename = `pgfy-all-leads-${today}.csv`;

    const response = await api.get('/reports/leads', {
      responseType: 'blob',
    });

    return triggerBrowserDownload(
      response.data,
      defaultFilename,
      response.headers['content-disposition']
    );
  },

  /**
   * Download Call History CSV Report (Admin Only)
   * GET /api/reports/calls
   */
  async downloadCallsReport(): Promise<string> {
    const today = new Date().toISOString().split('T')[0];
    const defaultFilename = `pgfy-call-history-${today}.csv`;

    const response = await api.get('/reports/calls', {
      responseType: 'blob',
    });

    return triggerBrowserDownload(
      response.data,
      defaultFilename,
      response.headers['content-disposition']
    );
  },

  /**
   * Download Executive Sales Performance CSV Report (Admin Only)
   * GET /api/reports/performance
   */
  async downloadPerformanceReport(): Promise<string> {
    const today = new Date().toISOString().split('T')[0];
    const defaultFilename = `pgfy-executive-performance-${today}.csv`;

    const response = await api.get('/reports/performance', {
      responseType: 'blob',
    });

    return triggerBrowserDownload(
      response.data,
      defaultFilename,
      response.headers['content-disposition']
    );
  },
};

export default reportService;
