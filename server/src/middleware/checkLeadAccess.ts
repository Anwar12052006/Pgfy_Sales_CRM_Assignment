import type { Request, Response, NextFunction } from 'express';
import { prisma, Role } from '../config/prisma.js';

/**
 * Lead Access Guard:
 * - ADMIN: Access granted to all leads.
 * - SALES_EXECUTIVE: Strict ownership check; can only access leads where assignedExecutiveId === req.user.id.
 * Prevents URL parameter tampering / IDOR vulnerabilities.
 */
export async function checkLeadAccess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    const rawLeadId = req.params['leadId'] || req.params['id'];
    const leadId = Array.isArray(rawLeadId) ? rawLeadId[0] : rawLeadId;

    if (!leadId) {
      res.status(400).json({
        success: false,
        message: 'Lead identifier parameter missing.',
      });
      return;
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        assignedExecutiveId: true,
      },
    });

    if (!lead) {
      res.status(404).json({
        success: false,
        message: 'Lead not found.',
      });
      return;
    }

    // Admins have unrestricted access
    if (req.user.role === Role.ADMIN) {
      next();
      return;
    }

    // Sales executives can only access leads assigned to them
    if (lead.assignedExecutiveId !== req.user.id) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to view or manage this lead.',
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}
