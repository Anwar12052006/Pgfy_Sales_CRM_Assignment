import { Router } from 'express';
import { prisma, Role } from '../config/prisma.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { asyncHandler } from '../utils/index.js';

export const userRouter = Router();

// User management endpoints require authentication
userRouter.use(authenticate);

/**
 * GET /api/users/executives
 * Lists active SALES_EXECUTIVE accounts for lead assignment dropdowns.
 * Restricted to ADMIN.
 */
userRouter.get(
  '/executives',
  authorize(Role.ADMIN),
  asyncHandler(async (_req, res) => {
    const executives = await prisma.user.findMany({
      where: {
        role: Role.SALES_EXECUTIVE,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.status(200).json({
      success: true,
      message: 'Active sales executives retrieved successfully',
      data: executives,
    });
  })
);
