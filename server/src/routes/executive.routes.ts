import { Router } from 'express';
import { prisma, Role } from '../config/prisma.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { checkLeadAccess } from '../middleware/checkLeadAccess.js';
import { asyncHandler } from '../utils/index.js';

import { dashboardController } from '../controllers/dashboard.controller.js';

export const executiveRouter = Router();

// Apply authentication and SALES_EXECUTIVE role check to all routes in this router
executiveRouter.use(authenticate, authorize(Role.SALES_EXECUTIVE));

/**
 * GET /api/executive/dashboard
 * Returns personalized dashboard data for the authenticated executive
 */
executiveRouter.get('/dashboard', dashboardController.getExecutiveDashboard);

/**
 * GET /api/executive/leads/:id
 * Strictly protected by checkLeadAccess:
 * Sales executives can ONLY view leads assigned to them.
 * Attempts to view other executives' leads return 403 Forbidden.
 */
executiveRouter.get(
  '/leads/:id',
  checkLeadAccess,
  asyncHandler(async (req, res) => {
    const rawId = req.params['id'];
    const leadId = Array.isArray(rawId) ? rawId[0] : rawId;

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        calls: {
          orderBy: { callDateTime: 'desc' },
          take: 5,
        },
        followUps: {
          orderBy: { dueAt: 'asc' },
        },
      },
    });

    res.json({
      success: true,
      data: lead,
    });
  })
);
