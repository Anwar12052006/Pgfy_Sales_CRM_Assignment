import { prisma, Role, LeadStatus, CallOutcome, FollowUpStatus } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthenticatedUser } from '../types/index.js';
import type { RecordCallInput, QueryCallsInput } from '../validators/call.validator.js';

/**
 * Outcome to LeadStatus progression mapping
 */
const OUTCOME_TO_LEAD_STATUS: Partial<Record<CallOutcome, LeadStatus>> = {
  [CallOutcome.INTERESTED]: LeadStatus.INTERESTED,
  [CallOutcome.NOT_INTERESTED]: LeadStatus.NOT_INTERESTED,
  [CallOutcome.CALL_BACK_REQUESTED]: LeadStatus.FOLLOW_UP,
  [CallOutcome.VISIT_SCHEDULED]: LeadStatus.VISIT_SCHEDULED,
  [CallOutcome.CONVERTED]: LeadStatus.CONVERTED,
};

export interface PaginatedCallsResult {
  calls: unknown[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class CallService {
  /**
   * Record a new call interaction.
   * - Enforces executive lead assignment ownership.
   * - Saves executiveId from authenticated user (no impersonation).
   * - Updates lead status based on outcome inside transaction.
   * - Optionally creates linked FollowUp record inside transaction.
   */
  public async recordCall(input: RecordCallInput, user: AuthenticatedUser) {
    const {
      leadId,
      callDateTime,
      durationSeconds,
      outcome,
      notes,
      nextFollowUpDate,
      nextFollowUpNotes,
    } = input;

    // 1. Fetch target lead to verify existence and check assignment
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        customerName: true,
        assignedExecutiveId: true,
        status: true,
      },
    });

    if (!lead) {
      throw new AppError('Lead not found', 404);
    }

    // 2. Ownership & permission enforcement:
    // Sales executives can only log calls for leads currently assigned to them
    if (user.role === Role.SALES_EXECUTIVE) {
      if (!lead.assignedExecutiveId) {
        throw new AppError(
          'Forbidden: You cannot log calls for unassigned leads. Please assign or request assignment first.',
          403
        );
      }

      if (lead.assignedExecutiveId !== user.id) {
        throw new AppError(
          'Forbidden: You can only log calls for leads currently assigned to you.',
          403
        );
      }
    }

    // 3. Determine if lead status should advance based on outcome
    const targetLeadStatus = OUTCOME_TO_LEAD_STATUS[outcome];

    // 4. Execute call logging, follow-up scheduling, and status transition in an atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // 4a. Create the Call record
      const call = await tx.call.create({
        data: {
          leadId,
          executiveId: user.id, // Strictly derived from JWT identity
          callDateTime: callDateTime ?? new Date(),
          durationSeconds,
          outcome,
          notes: notes?.trim() || null,
        },
        include: {
          lead: {
            select: {
              id: true,
              customerName: true,
              mobileNumber: true,
              status: true,
              propertyCategory: true,
              preferredLocation: true,
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

      // 4b. Optionally schedule linked follow-up if requested
      let followUp = null;
      if (nextFollowUpDate) {
        followUp = await tx.followUp.create({
          data: {
            leadId,
            executiveId: user.id,
            callId: call.id,
            dueAt: nextFollowUpDate,
            status: FollowUpStatus.PENDING,
            notes: nextFollowUpNotes?.trim() || notes?.trim() || `Follow-up scheduled from ${outcome} call`,
          },
        });
      }

      // 4c. Update lead status if outcome requires it
      let updatedLead = null;
      if (targetLeadStatus && targetLeadStatus !== lead.status) {
        updatedLead = await tx.lead.update({
          where: { id: leadId },
          data: { status: targetLeadStatus },
          select: {
            id: true,
            status: true,
          },
        });
      }

      return {
        ...call,
        lead: {
          ...call.lead,
          status: updatedLead ? updatedLead.status : call.lead.status,
        },
        followUps: followUp ? [followUp] : [],
      };
    });

    return result;
  }

  /**
   * Retrieve all call records with filtering and pagination.
   * - Admin can view all calls across all executives.
   * - Sales Executive can view strictly their own calls.
   */
  public async getCalls(query: QueryCallsInput, user: AuthenticatedUser): Promise<PaginatedCallsResult> {
    const { leadId, executiveId, outcome, startDate, endDate, page, limit } = query;
    const skip = (page - 1) * limit;

    // Build Prisma where filter
    const whereClause: Record<string, unknown> = {};

    // Role-based executive scoping
    if (user.role === Role.SALES_EXECUTIVE) {
      whereClause['executiveId'] = user.id;
    } else if (executiveId) {
      whereClause['executiveId'] = executiveId;
    }

    // Lead filter
    if (leadId) {
      whereClause['leadId'] = leadId;
    }

    // Outcome filter
    if (outcome) {
      whereClause['outcome'] = outcome;
    }

    // Date range filter
    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter['gte'] = startDate;
      if (endDate) dateFilter['lte'] = endDate;
      whereClause['callDateTime'] = dateFilter;
    }

    const [total, calls] = await Promise.all([
      prisma.call.count({ where: whereClause }),
      prisma.call.findMany({
        where: whereClause,
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
          followUps: {
            select: {
              id: true,
              dueAt: true,
              status: true,
              notes: true,
            },
          },
        },
        orderBy: {
          callDateTime: 'desc',
        },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      calls,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Retrieve a single call record by ID.
   * Enforces role isolation.
   */
  public async getCallById(callId: string, user: AuthenticatedUser) {
    const call = await prisma.call.findUnique({
      where: { id: callId },
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
        followUps: true,
      },
    });

    if (!call) {
      throw new AppError('Call record not found', 404);
    }

    // Executive isolation
    if (user.role === Role.SALES_EXECUTIVE && call.executiveId !== user.id) {
      throw new AppError('Forbidden: You can only view your own call records', 403);
    }

    return call;
  }

  /**
   * Retrieve call history for a specific lead.
   * - Admin can view history for any lead.
   * - Executive can view only for leads assigned to them.
   */
  public async getCallsByLeadId(leadId: string, user: AuthenticatedUser) {
    // 1. Verify lead existence and check executive access
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

    // Executive ownership check
    if (user.role === Role.SALES_EXECUTIVE && lead.assignedExecutiveId !== user.id) {
      throw new AppError('Forbidden: You can only view call history for your assigned leads', 403);
    }

    const calls = await prisma.call.findMany({
      where: { leadId },
      include: {
        executive: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        followUps: {
          select: {
            id: true,
            dueAt: true,
            status: true,
            notes: true,
          },
        },
      },
      orderBy: {
        callDateTime: 'desc',
      },
    });

    return {
      lead: {
        id: lead.id,
        customerName: lead.customerName,
      },
      calls,
    };
  }
}

export const callService = new CallService();
