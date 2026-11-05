import { prisma } from '../config/prisma.js';
import { dashboardService } from './dashboard.service.js';
import { generateCSV, formatINR, type CSVColumn } from '../utils/csv.js';

export class ReportService {
  /**
   * Export All Leads Report as RFC 4180 CSV
   * Columns: Lead ID, Customer name, Mobile number, Email, Property category,
   * Preferred location, Budget INR, Lead source, Lead status,
   * Assigned executive name, Enquiry date, Created date.
   */
  public async exportLeadsCSV(): Promise<string> {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        assignedExecutive: {
          select: {
            name: true,
          },
        },
      },
    });

    type LeadRow = typeof leads[number];

    const columns: CSVColumn<LeadRow>[] = [
      { header: 'Lead ID', accessor: (lead) => lead.id },
      { header: 'Customer Name', accessor: (lead) => lead.customerName },
      { header: 'Mobile Number', accessor: (lead) => lead.mobileNumber },
      { header: 'Email', accessor: (lead) => lead.email || 'N/A' },
      { header: 'Property Category', accessor: (lead) => lead.propertyCategory },
      { header: 'Preferred Location', accessor: (lead) => lead.preferredLocation },
      { header: 'Budget INR', accessor: (lead) => formatINR(lead.budget) },
      { header: 'Lead Source', accessor: (lead) => lead.leadSource },
      { header: 'Lead Status', accessor: (lead) => lead.status },
      {
        header: 'Assigned Executive Name',
        accessor: (lead) => (lead.assignedExecutive ? lead.assignedExecutive.name : 'Unassigned'),
      },
      { header: 'Enquiry Date', accessor: (lead) => lead.enquiryDate.toISOString() },
      { header: 'Created Date', accessor: (lead) => lead.createdAt.toISOString() },
    ];

    return generateCSV(columns, leads);
  }

  /**
   * Export Call History Report as RFC 4180 CSV
   * Columns: Call ID, Customer name, Customer mobile, Executive name,
   * Call date and time, Duration, Call outcome, Call notes, Next follow-up date.
   */
  public async exportCallsCSV(): Promise<string> {
    const calls = await prisma.call.findMany({
      orderBy: { callDateTime: 'desc' },
      include: {
        lead: {
          select: {
            customerName: true,
            mobileNumber: true,
          },
        },
        executive: {
          select: {
            name: true,
          },
        },
        followUps: {
          select: {
            dueAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    type CallRow = typeof calls[number];

    const columns: CSVColumn<CallRow>[] = [
      { header: 'Call ID', accessor: (call) => call.id },
      { header: 'Customer Name', accessor: (call) => (call.lead ? call.lead.customerName : 'N/A') },
      { header: 'Customer Mobile', accessor: (call) => (call.lead ? call.lead.mobileNumber : 'N/A') },
      { header: 'Executive Name', accessor: (call) => (call.executive ? call.executive.name : 'N/A') },
      { header: 'Call Date and Time', accessor: (call) => call.callDateTime.toISOString() },
      { header: 'Duration', accessor: (call) => `${call.durationSeconds}s` },
      { header: 'Call Outcome', accessor: (call) => call.outcome },
      { header: 'Call Notes', accessor: (call) => call.notes || '' },
      {
        header: 'Next Follow-up Date',
        accessor: (call) =>
          call.followUps && call.followUps.length > 0 && call.followUps[0]
            ? call.followUps[0].dueAt.toISOString()
            : 'N/A',
      },
    ];

    return generateCSV(columns, calls);
  }

  /**
   * Export Executive Sales Performance Report as RFC 4180 CSV
   * Columns: Executive name, Assigned leads, Unique leads contacted, Converted leads,
   * Total calls, Connected calls, Pending follow-ups, Overdue follow-ups,
   * Call coverage rate, Conversion rate, Connection rate.
   */
  public async exportPerformanceCSV(): Promise<string> {
    const performance = await dashboardService.getExecutivePerformance();

    type PerformanceRow = typeof performance[number];

    const columns: CSVColumn<PerformanceRow>[] = [
      { header: 'Executive Name', accessor: (p) => p.executiveName },
      { header: 'Assigned Leads', accessor: (p) => p.assignedLeads },
      { header: 'Unique Leads Contacted', accessor: (p) => p.uniqueLeadsContacted },
      { header: 'Converted Leads', accessor: (p) => p.convertedLeads },
      { header: 'Total Calls', accessor: (p) => p.totalCalls },
      { header: 'Connected Calls', accessor: (p) => p.connectedCalls },
      { header: 'Pending Follow-ups', accessor: (p) => p.pendingFollowUps },
      { header: 'Overdue Follow-ups', accessor: (p) => p.overdueFollowUps },
      { header: 'Call Coverage Rate', accessor: (p) => `${p.callCoverageRate}%` },
      { header: 'Conversion Rate', accessor: (p) => `${p.conversionRate}%` },
      { header: 'Connection Rate', accessor: (p) => `${p.connectionRate}%` },
    ];

    return generateCSV(columns, performance);
  }
}

export const reportService = new ReportService();
