import type { LucideIcon } from 'lucide-react';

export const Role = {
  ADMIN: 'ADMIN',
  SALES_EXECUTIVE: 'SALES_EXECUTIVE',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const LeadStatus = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  INTERESTED: 'INTERESTED',
  NOT_INTERESTED: 'NOT_INTERESTED',
  FOLLOW_UP: 'FOLLOW_UP',
  VISIT_SCHEDULED: 'VISIT_SCHEDULED',
  CONVERTED: 'CONVERTED',
  LOST: 'LOST',
} as const;
export type LeadStatus = (typeof LeadStatus)[keyof typeof LeadStatus];

export const CallOutcome = {
  CONNECTED: 'CONNECTED',
  NOT_ANSWERED: 'NOT_ANSWERED',
  BUSY: 'BUSY',
  SWITCHED_OFF: 'SWITCHED_OFF',
  INTERESTED: 'INTERESTED',
  NOT_INTERESTED: 'NOT_INTERESTED',
  CALL_BACK_REQUESTED: 'CALL_BACK_REQUESTED',
  VISIT_SCHEDULED: 'VISIT_SCHEDULED',
  CONVERTED: 'CONVERTED',
} as const;
export type CallOutcome = (typeof CallOutcome)[keyof typeof CallOutcome];

export const FollowUpStatus = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type FollowUpStatus = (typeof FollowUpStatus)[keyof typeof FollowUpStatus];

/** Authenticated user shape */
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive?: boolean;
}

/** Assigned Executive summary */
export interface AssignedExecutive {
  id: string;
  name: string;
  email: string;
}

/** Lead model representation */
export interface Lead {
  id: string;
  customerName: string;
  mobileNumber: string;
  email: string | null;
  propertyCategory: string;
  preferredLocation: string;
  budget: number | string;
  leadSource: string;
  status: LeadStatus;
  enquiryDate: string;
  assignedExecutiveId: string | null;
  assignedExecutive?: AssignedExecutive | null;
  createdAt: string;
  updatedAt: string;
}

/** Detailed lead representation with relations returned by GET /api/leads/:id */
export interface LeadDetail extends Lead {
  assignments?: Array<{
    id: string;
    assignedAt: string;
    executive?: { id: string; name: string; email: string };
    assignedBy?: { id: string; name: string; email: string };
  }>;
  calls?: Call[];
  followUps?: FollowUp[];
}

/** Standard API response envelope */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

/** Pagination metadata */
export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Paginated response */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: PaginationMetadata;
}

/** Login request payload */
export interface LoginCredentials {
  email: string;
  password: string;
}

/** Auth response */
export interface AuthResponse {
  token: string;
  user: User;
}

/** Generic Data Table Column definition */
export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  className?: string;
  render?: (item: T) => React.ReactNode;
}

/** Navigation link item */
export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: string | number;
}

/** Executive Performance item for Admin Dashboard */
export interface ExecutivePerformance {
  id?: string;
  executiveId: string;
  name?: string;
  executiveName: string;
  executiveEmail?: string;
  assignedLeads: number;
  totalAssignedLeads?: number;
  leadsContacted: number;
  uniqueLeadsContacted?: number;
  convertedLeads: number;
  conversions?: number;
  totalCalls: number;
  callsMade?: number;
  connectedCalls: number;
  pendingFollowUps?: number;
  overdueFollowUps?: number;
  callCoverageRate: number;
  conversionRate: number;
  connectionRate: number;
}

/** Admin Dashboard aggregated response payload */
export interface AdminDashboardData {
  totalLeads: number;
  assignedLeads: number;
  unassignedLeads: number;
  totalCalls: number;
  connectedCalls: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
  convertedLeads: number;
  callCoverageRate: number;
  conversionRate: number;
  connectionRate: number;
  leadStatusBreakdown: Record<string, number>;
  recentLeads: Lead[];
  executivePerformance: ExecutivePerformance[];
}

/** Executive Dashboard personalized response payload */
export interface ExecutiveDashboardData {
  executiveName: string;
  assignedLeads: number;
  totalAssignedLeads?: number;
  leadsContacted: number;
  uniqueLeadsContacted?: number;
  totalCalls: number;
  callsMade?: number;
  connectedCalls: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
  convertedLeads: number;
  conversions?: number;
  callCoverageRate: number;
  conversionRate: number;
  connectionRate: number;
  recentLeads: Lead[];
  leadStatusBreakdown?: Record<string, number>;
}

/** Call tracking record representation */
export interface Call {
  id: string;
  leadId: string;
  executiveId: string;
  callDateTime: string;
  durationSeconds: number;
  outcome: CallOutcome;
  notes: string | null;
  createdAt: string;
  lead?: {
    id: string;
    customerName: string;
    mobileNumber: string;
    email?: string | null;
    propertyCategory?: string;
    preferredLocation?: string;
    budget?: number | string;
    status?: LeadStatus;
  };
  executive?: {
    id: string;
    name: string;
    email: string;
  };
  followUps?: Array<{
    id: string;
    dueAt: string;
    status: FollowUpStatus;
    notes?: string | null;
  }>;
}

/** Input payload for recording an outbound/inbound call */
export interface RecordCallInput {
  leadId: string;
  callDateTime?: string;
  durationSeconds: number;
  outcome: CallOutcome;
  notes?: string;
  nextFollowUpDate?: string;
  nextFollowUpNotes?: string;
}

/** Filter and pagination query parameters for calls */
export interface QueryCallsParams {
  page?: number;
  limit?: number;
  leadId?: string;
  executiveId?: string;
  outcome?: CallOutcome | string;
  startDate?: string;
  endDate?: string;
}

/** Flexible lead representation for drawers and modals */
export type DrawerLead = Partial<Lead> & Pick<Lead, 'id' | 'customerName' | 'mobileNumber'>;

export type FollowUpClassification = 'TODAY' | 'UPCOMING' | 'OVERDUE' | 'COMPLETED' | 'CANCELLED';

/** Follow-up task entity */
export interface FollowUp {
  id: string;
  leadId: string;
  executiveId: string;
  dueAt: string;
  status: FollowUpStatus;
  notes: string | null;
  callId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  classification: FollowUpClassification;
  lead?: {
    id: string;
    customerName: string;
    mobileNumber: string;
    propertyCategory?: string;
    preferredLocation?: string;
    budget?: number | string;
    status?: LeadStatus;
  };
  executive?: {
    id: string;
    name: string;
    email: string;
  };
  call?: {
    id: string;
    callDateTime: string;
    durationSeconds: number;
    outcome: CallOutcome;
  } | null;
}

/** Query parameters for follow-ups */
export interface QueryFollowUpsParams {
  page?: number;
  limit?: number;
  classification?: string;
  status?: FollowUpStatus | string;
  executiveId?: string;
  leadId?: string;
  startDate?: string;
  endDate?: string;
}

/** Input payload for creating a follow-up */
export interface CreateFollowUpInput {
  leadId: string;
  dueAt: string;
  notes?: string;
  callId?: string;
}

/** Input payload for rescheduling a follow-up */
export interface RescheduleFollowUpInput {
  dueAt: string;
  notes?: string;
}

