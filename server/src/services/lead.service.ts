import { prisma, Role, LeadStatus } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthenticatedUser } from '../types/index.js';
import type {
  CreateLeadInput,
  UpdateLeadInput,
  QueryLeadsInput,
} from '../validators/lead.validator.js';

export interface PaginatedLeadsResult {
  leads: unknown[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class LeadService {
  /**
   * Create a new lead (Admin only).
   * Supports optional assignment during creation, logging initial LeadAssignment.
   */
  public async createLead(input: CreateLeadInput, adminUserId: string) {
    const { assignedExecutiveId, budget, ...leadData } = input;

    // Validate assigned executive if provided
    if (assignedExecutiveId) {
      const executive = await prisma.user.findUnique({
        where: { id: assignedExecutiveId },
        select: { id: true, role: true, isActive: true },
      });

      if (!executive) {
        throw new AppError('Assigned executive not found', 404);
      }
      if (executive.role !== Role.SALES_EXECUTIVE) {
        throw new AppError('Leads can only be assigned to users with SALES_EXECUTIVE role', 400);
      }
      if (!executive.isActive) {
        throw new AppError('Cannot assign lead to a deactivated sales executive', 400);
      }
    }

    return prisma.$transaction(async (tx) => {
      const lead = await tx.lead.create({
        data: {
          ...leadData,
          budget,
          assignedExecutiveId: assignedExecutiveId || null,
        },
        include: {
          assignedExecutive: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // If assigned at creation time, log initial assignment history
      if (assignedExecutiveId) {
        await tx.leadAssignment.create({
          data: {
            leadId: lead.id,
            executiveId: assignedExecutiveId,
            assignedById: adminUserId,
            assignedAt: new Date(),
          },
        });
      }

      return lead;
    });
  }

  /**
   * Retrieve leads with search, filtering and pagination.
   * Enforces role-based visibility:
   * - SALES_EXECUTIVE: strictly limited to leads assigned to them.
   * - ADMIN: can view all, filter by executiveId, or filter unassigned.
   */
  public async getLeads(
    currentUser: AuthenticatedUser,
    query: QueryLeadsInput
  ): Promise<PaginatedLeadsResult> {
    const { search, status, executiveId, assigned, page = 1, limit = 10 } = query;

    const where: any = {};

    // 1. Enforce Role-Based Scoping
    if (currentUser.role === Role.SALES_EXECUTIVE) {
      where.assignedExecutiveId = currentUser.id;
    } else {
      // ADMIN filters
      if (executiveId) {
        where.assignedExecutiveId = executiveId;
      } else if (assigned === 'true') {
        where.assignedExecutiveId = { not: null };
      } else if (assigned === 'false') {
        where.assignedExecutiveId = null;
      }
    }

    // 2. Status Filter
    if (status) {
      where.status = status;
    }

    // 3. Search Filter (by customerName or mobileNumber)
    if (search && search.trim() !== '') {
      const searchTerm = search.trim();
      where.OR = [
        { customerName: { contains: searchTerm, mode: 'insensitive' } },
        { mobileNumber: { contains: searchTerm } },
      ];
    }

    const skip = (page - 1) * limit;
    const take = limit;

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          assignedExecutive: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
    ]);

    return {
      leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieve single lead details with assignment history and activity logs.
   * Enforces data isolation for sales executives.
   */
  public async getLeadById(leadId: string, currentUser: AuthenticatedUser) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        assignedExecutive: {
          select: { id: true, name: true, email: true },
        },
        assignments: {
          orderBy: { assignedAt: 'desc' },
          include: {
            executive: {
              select: { id: true, name: true, email: true },
            },
            assignedBy: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        calls: {
          orderBy: { callDateTime: 'desc' },
          take: 10,
        },
        followUps: {
          orderBy: { dueAt: 'asc' },
        },
      },
    });

    if (!lead) {
      throw new AppError('Lead not found', 404);
    }

    // Role-based authorization check
    if (currentUser.role === Role.SALES_EXECUTIVE && lead.assignedExecutiveId !== currentUser.id) {
      throw new AppError('Forbidden: You are not authorized to view this lead', 403);
    }

    return lead;
  }

  /**
   * Update general lead information (Admin only).
   */
  public async updateLead(leadId: string, input: UpdateLeadInput) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new AppError('Lead not found', 404);
    }

    return prisma.lead.update({
      where: { id: leadId },
      data: input,
      include: {
        assignedExecutive: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Update lead status (Admin or assigned Sales Executive).
   */
  public async updateLeadStatus(
    leadId: string,
    status: LeadStatus,
    currentUser: AuthenticatedUser
  ) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, assignedExecutiveId: true, status: true },
    });

    if (!lead) {
      throw new AppError('Lead not found', 404);
    }

    // Sales executives can only update their own assigned leads
    if (currentUser.role === Role.SALES_EXECUTIVE && lead.assignedExecutiveId !== currentUser.id) {
      throw new AppError('Forbidden: You are not authorized to update this lead', 403);
    }

    return prisma.lead.update({
      where: { id: leadId },
      data: { status },
      include: {
        assignedExecutive: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Assign or reassign lead to a sales executive (Admin only).
   * Runs in a transaction:
   * 1. Closes previous active LeadAssignment (sets unassignedAt).
   * 2. Inserts new LeadAssignment with admin audit log.
   * 3. Updates Lead.assignedExecutiveId.
   */
  public async assignLead(leadId: string, newExecutiveId: string, adminUserId: string) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new AppError('Lead not found', 404);
    }

    // Verify target executive exists, is active, and is a SALES_EXECUTIVE
    const targetExecutive = await prisma.user.findUnique({
      where: { id: newExecutiveId },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    if (!targetExecutive) {
      throw new AppError('Target executive not found', 404);
    }

    if (targetExecutive.role !== Role.SALES_EXECUTIVE) {
      throw new AppError('Leads can only be assigned to users with SALES_EXECUTIVE role', 400);
    }

    if (!targetExecutive.isActive) {
      throw new AppError('Cannot assign lead to a deactivated sales executive', 400);
    }

    // Idempotent check: if already assigned to this executive, return current state
    if (lead.assignedExecutiveId === newExecutiveId) {
      return prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          assignedExecutive: {
            select: { id: true, name: true, email: true },
          },
        },
      });
    }

    const now = new Date();

    // Atomic assignment transaction
    return prisma.$transaction(async (tx) => {
      // 1. Close out any previous active assignment record for this lead
      await tx.leadAssignment.updateMany({
        where: {
          leadId,
          unassignedAt: null,
        },
        data: {
          unassignedAt: now,
        },
      });

      // 2. Create the new historical assignment record
      await tx.leadAssignment.create({
        data: {
          leadId,
          executiveId: newExecutiveId,
          assignedById: adminUserId,
          assignedAt: now,
        },
      });

      // 3. Update active executive on the lead
      return tx.lead.update({
        where: { id: leadId },
        data: {
          assignedExecutiveId: newExecutiveId,
        },
        include: {
          assignedExecutive: {
            select: { id: true, name: true, email: true },
          },
        },
      });
    });
  }

  /**
   * Retrieve complete assignment history for a lead (Admin only).
   * Chronologically orders all historical assignment transitions.
   */
  public async getLeadAssignments(leadId: string) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        customerName: true,
        assignedExecutiveId: true,
        assignedExecutive: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!lead) {
      throw new AppError('Lead not found', 404);
    }

    const assignments = await prisma.leadAssignment.findMany({
      where: { leadId },
      orderBy: { assignedAt: 'desc' },
      include: {
        executive: {
          select: { id: true, name: true, email: true },
        },
        assignedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return {
      lead,
      totalAssignments: assignments.length,
      assignments,
    };
  }
}

export const leadService = new LeadService();
