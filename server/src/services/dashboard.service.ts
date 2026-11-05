import { prisma, Role, LeadStatus, CallOutcome, FollowUpStatus } from '../config/prisma.js';
import { getISTDayBoundaries } from '../utils/timezone.js';
import { AppError } from '../middleware/errorHandler.js';

export interface ExecutivePerformanceMetric {
  id: string;
  executiveId: string;
  name: string;
  executiveName: string;
  executiveEmail: string;
  assignedLeads: number;
  totalAssignedLeads: number;
  leadsContacted: number;
  uniqueLeadsContacted: number;
  convertedLeads: number;
  conversions: number;
  totalCalls: number;
  callsMade: number;
  connectedCalls: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
  callCoverageRate: number; // Unique assigned leads contacted / Total assigned leads * 100
  conversionRate: number;   // Converted assigned leads / Total assigned leads * 100
  connectionRate: number;   // Connected calls / Total calls * 100
}

export interface AdminDashboardData {
  totalLeads: number;
  assignedLeads: number;
  unassignedLeads: number;
  totalCalls: number;
  connectedCalls: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
  convertedLeads: number;
  callCoverageRate: number; // Unique assigned leads contacted / Total assigned leads * 100
  conversionRate: number;   // Converted assigned leads / Total assigned leads * 100
  connectionRate: number;   // Connected calls / Total calls * 100
  leadStatusBreakdown: Record<string, number>;
  recentLeads: Array<{
    id: string;
    customerName: string;
    mobileNumber: string;
    propertyCategory: string;
    preferredLocation: string;
    budget: number;
    status: LeadStatus;
    enquiryDate: Date;
    assignedExecutive: {
      id: string;
      name: string;
      email: string;
    } | null;
  }>;
  executivePerformance: ExecutivePerformanceMetric[];
}

export interface ExecutiveDashboardData {
  executiveName: string;
  assignedLeads: number;
  totalAssignedLeads: number;
  leadsContacted: number;
  uniqueLeadsContacted: number;
  convertedLeads: number;
  conversions: number;
  totalCalls: number;
  callsMade: number;
  connectedCalls: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
  callCoverageRate: number; // Unique assigned leads contacted / Total assigned leads * 100
  conversionRate: number;   // Converted assigned leads / Total assigned leads * 100
  connectionRate: number;   // Connected calls / Total calls * 100
  recentLeads: Array<{
    id: string;
    customerName: string;
    mobileNumber: string;
    propertyCategory: string;
    preferredLocation: string;
    budget: number;
    status: LeadStatus;
    enquiryDate: Date;
    createdAt: Date;
  }>;
  leadStatusBreakdown: Record<string, number>;
}

export class DashboardService {
  /**
   * Aggregate executive sales performance analytics for every active executive.
   * Uses distinct lead tracking, assignment timestamps, and zero-division guards.
   */
  public async getExecutivePerformance(): Promise<ExecutivePerformanceMetric[]> {
    const { startOfToday } = getISTDayBoundaries(new Date());

    const executives = await prisma.user.findMany({
      where: {
        role: Role.SALES_EXECUTIVE,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        assignedLeads: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            assignments: {
              where: { unassignedAt: null },
              select: { assignedAt: true },
              take: 1,
            },
          },
        },
        calls: {
          select: {
            id: true,
            leadId: true,
            outcome: true,
            callDateTime: true,
          },
        },
        followUps: {
          where: {
            status: FollowUpStatus.PENDING,
          },
          select: {
            id: true,
            dueAt: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return executives.map((exec) => {
      const totalAssignedLeads = exec.assignedLeads.length;

      // Build map of currently assigned lead IDs to their active assignment start timestamp
      const assignedLeadMap = new Map<string, Date>();
      for (const lead of exec.assignedLeads) {
        const activeAssignmentDate = lead.assignments[0]?.assignedAt || lead.createdAt;
        assignedLeadMap.set(lead.id, activeAssignmentDate);
      }

      // Unique assigned leads contacted during current assignment
      const contactedLeadIds = new Set<string>();
      for (const call of exec.calls) {
        const assignmentDate = assignedLeadMap.get(call.leadId);
        if (assignmentDate && call.callDateTime >= assignmentDate) {
          contactedLeadIds.add(call.leadId);
        }
      }
      const uniqueLeadsContacted = contactedLeadIds.size;

      // Converted leads among assigned leads
      const convertedLeads = exec.assignedLeads.filter(
        (lead) => lead.status === LeadStatus.CONVERTED
      ).length;

      // Call metrics
      const totalCalls = exec.calls.length;
      const connectedCalls = exec.calls.filter(
        (call) => call.outcome === CallOutcome.CONNECTED
      ).length;

      // Follow-up metrics
      const pendingFollowUps = exec.followUps.length;
      const overdueFollowUps = exec.followUps.filter(
        (fu) => fu.dueAt < startOfToday
      ).length;

      // 1. Call Coverage Rate = Unique assigned leads contacted / Total assigned leads * 100
      const callCoverageRate =
        totalAssignedLeads > 0
          ? Math.round((uniqueLeadsContacted / totalAssignedLeads) * 1000) / 10
          : 0;

      // 2. Conversion Rate = Converted assigned leads / Total assigned leads * 100
      const conversionRate =
        totalAssignedLeads > 0
          ? Math.round((convertedLeads / totalAssignedLeads) * 1000) / 10
          : 0;

      // 3. Connection Rate = Connected calls / Total calls * 100
      const connectionRate =
        totalCalls > 0
          ? Math.round((connectedCalls / totalCalls) * 1000) / 10
          : 0;

      return {
        id: exec.id,
        executiveId: exec.id,
        name: exec.name,
        executiveName: exec.name,
        executiveEmail: exec.email,
        assignedLeads: totalAssignedLeads,
        totalAssignedLeads,
        leadsContacted: uniqueLeadsContacted,
        uniqueLeadsContacted,
        convertedLeads,
        conversions: convertedLeads,
        totalCalls,
        callsMade: totalCalls,
        connectedCalls,
        pendingFollowUps,
        overdueFollowUps,
        callCoverageRate,
        conversionRate,
        connectionRate,
      };
    });
  }

  /**
   * Aggregate real metrics for the Admin CRM Dashboard
   */
  public async getAdminDashboard(): Promise<AdminDashboardData> {
    const { startOfToday } = getISTDayBoundaries(new Date());

    // Execute queries concurrently
    const [
      totalLeads,
      assignedLeads,
      unassignedLeads,
      totalCalls,
      connectedCallsCount,
      pendingFollowUps,
      overdueFollowUps,
      convertedLeads,
      convertedAssignedLeads,
      statusGroupResults,
      recentLeadsRaw,
      executivePerformance,
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { assignedExecutiveId: { not: null } } }),
      prisma.lead.count({ where: { assignedExecutiveId: null } }),
      prisma.call.count(),
      prisma.call.count({
        where: {
          outcome: CallOutcome.CONNECTED,
        },
      }),
      prisma.followUp.count({ where: { status: FollowUpStatus.PENDING } }),
      prisma.followUp.count({
        where: {
          status: FollowUpStatus.PENDING,
          dueAt: { lt: startOfToday },
        },
      }),
      prisma.lead.count({ where: { status: LeadStatus.CONVERTED } }),
      prisma.lead.count({
        where: {
          assignedExecutiveId: { not: null },
          status: LeadStatus.CONVERTED,
        },
      }),
      prisma.lead.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.lead.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          customerName: true,
          mobileNumber: true,
          propertyCategory: true,
          preferredLocation: true,
          budget: true,
          status: true,
          enquiryDate: true,
          assignedExecutive: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      this.getExecutivePerformance(),
    ]);

    // Format status breakdown dictionary with 0 as default for all enum statuses
    const leadStatusBreakdown: Record<string, number> = {
      [LeadStatus.NEW]: 0,
      [LeadStatus.CONTACTED]: 0,
      [LeadStatus.INTERESTED]: 0,
      [LeadStatus.NOT_INTERESTED]: 0,
      [LeadStatus.FOLLOW_UP]: 0,
      [LeadStatus.VISIT_SCHEDULED]: 0,
      [LeadStatus.CONVERTED]: 0,
      [LeadStatus.LOST]: 0,
    };

    for (const group of statusGroupResults) {
      leadStatusBreakdown[group.status] = group._count.id;
    }

    // Overall metrics calculation
    const totalUniqueLeadsContacted = executivePerformance.reduce(
      (acc, exec) => acc + exec.uniqueLeadsContacted,
      0
    );

    // Call Coverage Rate = Unique assigned leads contacted / Total assigned leads * 100
    const callCoverageRate =
      assignedLeads > 0
        ? Math.round((totalUniqueLeadsContacted / assignedLeads) * 1000) / 10
        : 0;

    // Conversion Rate = Converted assigned leads / Total assigned leads * 100
    const conversionRate =
      assignedLeads > 0
        ? Math.round((convertedAssignedLeads / assignedLeads) * 1000) / 10
        : 0;

    // Connection Rate = Connected calls / Total calls * 100
    const connectionRate =
      totalCalls > 0
        ? Math.round((connectedCallsCount / totalCalls) * 1000) / 10
        : 0;

    const recentLeads = recentLeadsRaw.map((lead) => ({
      ...lead,
      budget: Number(lead.budget),
    }));

    return {
      totalLeads,
      assignedLeads,
      unassignedLeads,
      totalCalls,
      connectedCalls: connectedCallsCount,
      pendingFollowUps,
      overdueFollowUps,
      convertedLeads,
      callCoverageRate,
      conversionRate,
      connectionRate,
      leadStatusBreakdown,
      recentLeads,
      executivePerformance,
    };
  }

  /**
   * Aggregate personalized metrics strictly scoped to the authenticated sales executive.
   * Executive ID is derived exclusively from JWT.
   */
  public async getExecutiveDashboard(executiveId: string): Promise<ExecutiveDashboardData> {
    const { startOfToday } = getISTDayBoundaries(new Date());

    const executive = await prisma.user.findUnique({
      where: { id: executiveId },
      select: {
        id: true,
        name: true,
        assignedLeads: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            assignments: {
              where: { unassignedAt: null },
              select: { assignedAt: true },
              take: 1,
            },
          },
        },
        calls: {
          select: {
            id: true,
            leadId: true,
            outcome: true,
            callDateTime: true,
          },
        },
        followUps: {
          where: {
            status: FollowUpStatus.PENDING,
          },
          select: {
            id: true,
            dueAt: true,
          },
        },
      },
    });

    if (!executive) {
      throw new AppError('Executive not found', 404);
    }

    const recentLeadsRaw = await prisma.lead.findMany({
      where: { assignedExecutiveId: executiveId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        customerName: true,
        mobileNumber: true,
        propertyCategory: true,
        preferredLocation: true,
        budget: true,
        status: true,
        enquiryDate: true,
        createdAt: true,
      },
    });

    const totalAssignedLeads = executive.assignedLeads.length;

    // Build map of currently assigned lead IDs to their active assignment start timestamp
    const assignedLeadMap = new Map<string, Date>();
    for (const lead of executive.assignedLeads) {
      const activeAssignmentDate = lead.assignments[0]?.assignedAt || lead.createdAt;
      assignedLeadMap.set(lead.id, activeAssignmentDate);
    }

    // Unique assigned leads contacted during current assignment
    const contactedLeadIds = new Set<string>();
    for (const call of executive.calls) {
      const assignmentDate = assignedLeadMap.get(call.leadId);
      if (assignmentDate && call.callDateTime >= assignmentDate) {
        contactedLeadIds.add(call.leadId);
      }
    }
    const uniqueLeadsContacted = contactedLeadIds.size;

    // Converted leads among assigned leads
    const convertedLeads = executive.assignedLeads.filter(
      (lead) => lead.status === LeadStatus.CONVERTED
    ).length;

    // Call metrics
    const totalCalls = executive.calls.length;
    const connectedCalls = executive.calls.filter(
      (call) => call.outcome === CallOutcome.CONNECTED
    ).length;

    // Follow-up metrics
    const pendingFollowUps = executive.followUps.length;
    const overdueFollowUps = executive.followUps.filter(
      (fu) => fu.dueAt < startOfToday
    ).length;

    // 1. Call Coverage Rate = Unique assigned leads contacted / Total assigned leads * 100
    const callCoverageRate =
      totalAssignedLeads > 0
        ? Math.round((uniqueLeadsContacted / totalAssignedLeads) * 1000) / 10
        : 0;

    // 2. Conversion Rate = Converted assigned leads / Total assigned leads * 100
    const conversionRate =
      totalAssignedLeads > 0
        ? Math.round((convertedLeads / totalAssignedLeads) * 1000) / 10
        : 0;

    // 3. Connection Rate = Connected calls / Total calls * 100
    const connectionRate =
      totalCalls > 0
        ? Math.round((connectedCalls / totalCalls) * 1000) / 10
        : 0;

    const recentLeads = recentLeadsRaw.map((lead) => ({
      ...lead,
      budget: Number(lead.budget),
    }));

    // Status breakdown across assigned leads
    const statusCounts: Record<string, number> = {};
    for (const status of Object.values(LeadStatus)) {
      statusCounts[status] = 0;
    }
    for (const lead of executive.assignedLeads) {
      const current = statusCounts[lead.status] ?? 0;
      statusCounts[lead.status] = current + 1;
    }

    return {
      executiveName: executive.name || 'Sales Executive',
      assignedLeads: totalAssignedLeads,
      totalAssignedLeads,
      leadsContacted: uniqueLeadsContacted,
      uniqueLeadsContacted,
      convertedLeads,
      conversions: convertedLeads,
      totalCalls,
      callsMade: totalCalls,
      connectedCalls,
      pendingFollowUps,
      overdueFollowUps,
      callCoverageRate,
      conversionRate,
      connectionRate,
      recentLeads,
      leadStatusBreakdown: statusCounts,
    };
  }
}

export const dashboardService = new DashboardService();
