import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { Role } from '../config/prisma.js';

export const dashboardRouter = Router();

// Apply authentication to all dashboard routes
dashboardRouter.use(authenticate);

/**
 * GET /api/dashboard/admin
 * Restricted exclusively to ADMIN role
 */
dashboardRouter.get(
  '/admin',
  authorize(Role.ADMIN),
  dashboardController.getAdminDashboard
);

/**
 * GET /api/dashboard/admin/performance
 * Restricted exclusively to ADMIN role
 */
dashboardRouter.get(
  '/admin/performance',
  authorize(Role.ADMIN),
  dashboardController.getAdminPerformance
);

/**
 * GET /api/dashboard/executive
 * Personalized dashboard for authenticated executive (derived from JWT)
 */
dashboardRouter.get(
  '/executive',
  dashboardController.getExecutiveDashboard
);
