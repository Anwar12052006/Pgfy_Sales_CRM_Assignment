import type { Request, Response } from 'express';
import { reportService } from '../services/report.service.js';
import { asyncHandler } from '../utils/index.js';

function getTimestampSuffix(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export class ReportController {
  /**
   * GET /api/reports/leads
   * Export All Leads CSV Report (Admin Only)
   */
  public getLeadsReport = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const csvData = await reportService.exportLeadsCSV();
    const filename = `pgfy-leads-report-${getTimestampSuffix()}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvData);
  });

  /**
   * GET /api/reports/calls
   * Export Call History CSV Report (Admin Only)
   */
  public getCallsReport = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const csvData = await reportService.exportCallsCSV();
    const filename = `pgfy-calls-report-${getTimestampSuffix()}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvData);
  });

  /**
   * GET /api/reports/performance
   * Export Executive Performance CSV Report (Admin Only)
   */
  public getPerformanceReport = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const csvData = await reportService.exportPerformanceCSV();
    const filename = `pgfy-performance-report-${getTimestampSuffix()}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvData);
  });
}

export const reportController = new ReportController();
