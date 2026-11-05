import type { Request, Response } from 'express';
import { dashboardService } from '../services/dashboard.service.js';
import { asyncHandler } from '../utils/index.js';

export class DashboardController {
  /**
   * GET /api/dashboard/admin
   * Retrieve aggregated CRM statistics for Admin Dashboard
   */
  public getAdminDashboard = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const data = await dashboardService.getAdminDashboard();

    res.status(200).json({
      success: true,
      message: 'Admin dashboard metrics retrieved successfully',
      data,
    });
  });

  /**
   * GET /api/dashboard/executive
   * Retrieve personalized CRM metrics strictly scoped to the authenticated sales executive.
   * Executive ID is derived exclusively from authenticated JWT, never a request parameter.
   */
  public getExecutiveDashboard = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const executiveId = req.user!.id;
    const data = await dashboardService.getExecutiveDashboard(executiveId);

    res.status(200).json({
      success: true,
      message: 'Executive dashboard metrics retrieved successfully',
      data,
    });
  });

  /**
   * GET /api/dashboard/admin/performance
   * Retrieve sales performance metrics for all active sales executives
   */
  public getAdminPerformance = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const data = await dashboardService.getExecutivePerformance();

    res.status(200).json({
      success: true,
      message: 'Executive performance analytics retrieved successfully',
      data,
    });
  });
}

export const dashboardController = new DashboardController();
