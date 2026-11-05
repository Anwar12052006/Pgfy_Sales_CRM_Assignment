import type { Request, Response, NextFunction } from 'express';
import { Role } from '../config/prisma.js';

/**
 * Role-Based Access Control (RBAC) middleware:
 * Ensures the authenticated user possesses one of the allowed roles.
 * Must be preceded by the authenticate middleware.
 */
export function authorize(...allowedRoles: (Role | 'ADMIN' | 'SALES_EXECUTIVE')[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required prior to authorization check.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: Insufficient permissions to access this resource.',
      });
      return;
    }

    next();
  };
}
