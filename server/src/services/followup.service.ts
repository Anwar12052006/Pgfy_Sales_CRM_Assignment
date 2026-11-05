import { prisma, Role, FollowUpStatus } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthenticatedUser } from '../types/index.js';
import { getISTDayBoundaries, classifyFollowUp } from '../utils/timezone.js';
import type {
  CreateFollowUpInput,
  UpdateFollowUpStatusInput,
  RescheduleFollowUpInput,
  QueryFollowUpsInput,
} from '../validators/followup.validator.js';

export interface PaginatedFollowUpsResult {
  followUps: unknown[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary?: {
    todayCount: number;
    upcomingCount: number;
    overdueCount: number;
    completedCount: number;
  };
}

export class FollowUpService {
  /**
   * Schedule a new follow-up task.
   * - Enforces executive assignment ownership.
   * - Attaches executiveId from authenticated user.
   */
  public async createFollowUp(input: CreateFollowUpInput, user: AuthenticatedUser) {
    const { leadId, dueAt, notes, callId } = input;

    // 1. Verify target lead existence & ownership
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        customerName: true,
        assignedExecutiveId: true,
      },
    });

    if (!lead) {
      throw new AppError('Lead not found', 404);
    }

    if (user.role === Role.SALES_EXECUTIVE) {
      if (!lead.assignedExecutiveId || lead.assignedExecutiveId !== user.id) {
        throw new AppError('Forbidden: You can only schedule follow-ups for your assigned leads', 403);
      }
    }

    // 2. Validate linked call if provided
    if (callId) {
      const call = await prisma.call.findUnique({
        where: { id: callId },
        select: { id: true, leadId: true },
      });
      if (!call || call.leadId !== leadId) {
        throw new AppError('Linked call does not exist or belongs to a different lead', 400);
      }
    }

    // 3. Create FollowUp record
    const followUp = await prisma.followUp.create({
      data: {
        leadId,
        executiveId: user.id, // Strictly derived from JWT
        dueAt,
        status: FollowUpStatus.PENDING,
        notes: notes?.trim() || null,
        callId: callId || null,
      },
      include: {
        lead: {
          select: {
            id: true,
            customerName: true,
            mobileNumber: true,
            propertyCategory: true,
            preferredLocation: true,
            status: true,
          },
        },
        executive: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      ...followUp,
      classification: classifyFollowUp(followUp.dueAt, followUp.status),
    };
  }

  /**
   * Query follow-ups with role-based scoping, classification filters, and pagination.
   */
  public async getFollowUps(
    query: QueryFollowUpsInput,
    user: AuthenticatedUser
  ): Promise<PaginatedFollowUpsResult> {
    const { leadId, executiveId, status, classification, startDate, endDate, page, limit } = query;
    const skip = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {};

    // 1. Role-based scoping
    if (user.role === Role.SALES_EXECUTIVE) {
      whereClause['executiveId'] = user.id;
    } else if (executiveId) {
      whereClause['executiveId'] = executiveId;
    }

    // 2. Lead filter
    if (leadId) {
      whereClause['leadId'] = leadId;
    }

    // 3. Direct status filter
    if (status) {
      whereClause['status'] = status;
    }

    // 4. Timezone-aware classification filtering (Asia/Kolkata calendar day)
    const { startOfToday, endOfToday } = getISTDayBoundaries();

    if (classification) {
      switch (classification) {
        case 'today':
          whereClause['status'] = FollowUpStatus.PENDING;
          whereClause['dueAt'] = {
            gte: startOfToday,
            lte: endOfToday,
          };
          break;
        case 'upcoming':
          whereClause['status'] = FollowUpStatus.PENDING;
          whereClause['dueAt'] = {
            gt: endOfToday,
          };
          break;
        case 'overdue':
          whereClause['status'] = FollowUpStatus.PENDING;
          whereClause['dueAt'] = {
            lt: startOfToday,
          };
          break;
        case 'completed':
          whereClause['status'] = FollowUpStatus.COMPLETED;
          break;
        case 'cancelled':
          whereClause['status'] = FollowUpStatus.CANCELLED;
          break;
      }
    } else if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter['gte'] = startDate;
      if (endDate) dateFilter['lte'] = endDate;
      whereClause['dueAt'] = dateFilter;
    }

    // 5. Query records and count in parallel
    const [total, followUps] = await Promise.all([
      prisma.followUp.count({ where: whereClause }),
      prisma.followUp.findMany({
        where: whereClause,
        include: {
          lead: {
            select: {
              id: true,
              customerName: true,
              mobileNumber: true,
              propertyCategory: true,
              preferredLocation: true,
              budget: true,
              status: true,
            },
          },
          executive: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          call: {
            select: {
              id: true,
              callDateTime: true,
              durationSeconds: true,
              outcome: true,
            },
          },
        },
        orderBy: {
          dueAt: 'asc',
        },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    // Decorate each item with current classification
    const decoratedFollowUps = followUps.map((f) => ({
      ...f,
      classification: classifyFollowUp(f.dueAt, f.status),
    }));

    return {
      followUps: decoratedFollowUps,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Retrieve a single follow-up by ID with ownership guard.
   */
  public async getFollowUpById(id: string, user: AuthenticatedUser) {
    const followUp = await prisma.followUp.findUnique({
      where: { id },
      include: {
        lead: {
          select: {
            id: true,
            customerName: true,
            mobileNumber: true,
            email: true,
            propertyCategory: true,
            preferredLocation: true,
            budget: true,
            status: true,
            assignedExecutiveId: true,
          },
        },
        executive: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        call: {
          select: {
            id: true,
            callDateTime: true,
            durationSeconds: true,
            outcome: true,
            notes: true,
          },
        },
      },
    });

    if (!followUp) {
      throw new AppError('Follow-up task not found', 404);
    }

    // Ownership check for sales executive
    if (user.role === Role.SALES_EXECUTIVE && followUp.executiveId !== user.id) {
      throw new AppError('Forbidden: You can only view your own follow-up tasks', 403);
    }

    return {
      ...followUp,
      classification: classifyFollowUp(followUp.dueAt, followUp.status),
    };
  }

  /**
   * Update follow-up status (e.g. COMPLETED or CANCELLED).
   * Business rules:
   * - Only PENDING follow-ups can be completed or cancelled.
   * - Sets completedAt when marking COMPLETED.
   */
  public async updateStatus(
    id: string,
    input: UpdateFollowUpStatusInput,
    user: AuthenticatedUser
  ) {
    const followUp = await prisma.followUp.findUnique({
      where: { id },
      select: {
        id: true,
        executiveId: true,
        status: true,
        notes: true,
      },
    });

    if (!followUp) {
      throw new AppError('Follow-up task not found', 404);
    }

    // Ownership check
    if (user.role === Role.SALES_EXECUTIVE && followUp.executiveId !== user.id) {
      throw new AppError('Forbidden: You can only update your own follow-up tasks', 403);
    }

    // Business rule: Only PENDING tasks can be changed
    if (followUp.status !== FollowUpStatus.PENDING) {
      throw new AppError(
        `Cannot update status: Follow-up is already marked as ${followUp.status}`,
        400
      );
    }

    const updatedNotes = input.notes?.trim()
      ? followUp.notes
        ? `${followUp.notes}\n[Status: ${input.status}] ${input.notes.trim()}`
        : `[Status: ${input.status}] ${input.notes.trim()}`
      : followUp.notes;

    const updated = await prisma.followUp.update({
      where: { id },
      data: {
        status: input.status,
        completedAt: input.status === FollowUpStatus.COMPLETED ? new Date() : null,
        notes: updatedNotes,
      },
      include: {
        lead: {
          select: {
            id: true,
            customerName: true,
            mobileNumber: true,
            status: true,
          },
        },
        executive: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      ...updated,
      classification: classifyFollowUp(updated.dueAt, updated.status),
    };
  }

  /**
   * Reschedule an existing follow-up.
   * Business rules:
   * - Only PENDING follow-ups can be rescheduled.
   * - Updates existing record (no duplicate creation).
   * - Preserves linked callId and call history intact.
   */
  public async rescheduleFollowUp(
    id: string,
    input: RescheduleFollowUpInput,
    user: AuthenticatedUser
  ) {
    const followUp = await prisma.followUp.findUnique({
      where: { id },
      select: {
        id: true,
        executiveId: true,
        status: true,
        dueAt: true,
        notes: true,
        callId: true,
      },
    });

    if (!followUp) {
      throw new AppError('Follow-up task not found', 404);
    }

    // Ownership check
    if (user.role === Role.SALES_EXECUTIVE && followUp.executiveId !== user.id) {
      throw new AppError('Forbidden: You can only reschedule your own follow-up tasks', 403);
    }

    // Business rule: Only PENDING tasks can be rescheduled
    if (followUp.status !== FollowUpStatus.PENDING) {
      throw new AppError(
        `Cannot reschedule: Follow-up is already marked as ${followUp.status}`,
        400
      );
    }

    const updatedNotes = input.notes?.trim()
      ? followUp.notes
        ? `${followUp.notes}\n[Rescheduled] ${input.notes.trim()}`
        : `[Rescheduled] ${input.notes.trim()}`
      : followUp.notes;

    const updated = await prisma.followUp.update({
      where: { id },
      data: {
        dueAt: input.dueAt,
        notes: updatedNotes,
      },
      include: {
        lead: {
          select: {
            id: true,
            customerName: true,
            mobileNumber: true,
            status: true,
          },
        },
        executive: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        call: {
          select: {
            id: true,
            callDateTime: true,
            outcome: true,
          },
        },
      },
    });

    return {
      ...updated,
      classification: classifyFollowUp(updated.dueAt, updated.status),
    };
  }
}

export const followUpService = new FollowUpService();
