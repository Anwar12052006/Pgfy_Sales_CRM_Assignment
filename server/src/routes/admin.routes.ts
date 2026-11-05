import { Router } from 'express';
import { prisma, Role } from '../config/prisma.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { asyncHandler } from '../utils/index.js';

import { dashboardController } from '../controllers/dashboard.controller.js';

export const adminRouter = Router();

// Apply authentication and ADMIN role check to all routes in this router
adminRouter.use(authenticate, authorize(Role.ADMIN));

/**
 * GET /api/admin/dashboard
 * Access restricted exclusively to ADMIN
 */
adminRouter.get('/dashboard', dashboardController.getAdminDashboard);

/**
 * GET /api/admin/users
 * Returns list of team members
 */
adminRouter.get(
  '/users',
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: users,
    });
  })
);
