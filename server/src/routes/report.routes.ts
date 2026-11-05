import { Router } from 'express';
import { reportController } from '../controllers/report.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { Role } from '../config/prisma.js';

export const reportRouter = Router();

// Security: All report endpoints require valid JWT authentication and ADMIN role authorization
reportRouter.use(authenticate);
reportRouter.use(authorize(Role.ADMIN));

/**
 * GET /api/reports/leads
 * Export complete leads CSV report
 */
reportRouter.get('/leads', reportController.getLeadsReport);

/**
 * GET /api/reports/calls
 * Export complete call history CSV report
 */
reportRouter.get('/calls', reportController.getCallsReport);

/**
 * GET /api/reports/performance
 * Export executive sales performance CSV report
 */
reportRouter.get('/performance', reportController.getPerformanceReport);
