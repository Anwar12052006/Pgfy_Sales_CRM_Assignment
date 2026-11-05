import { z } from 'zod';
import { FollowUpStatus } from '../config/prisma.js';

/**
 * Validation schema for scheduling a new follow-up
 */
export const createFollowUpSchema = z.object({
  leadId: z.string().uuid('Lead ID must be a valid UUID'),
  dueAt: z.coerce.date({
    message: 'dueAt must be a valid ISO Date string',
  }),
  notes: z
    .string()
    .trim()
    .max(2000, 'Notes cannot exceed 2000 characters')
    .optional()
    .nullable(),
  callId: z
    .string()
    .uuid('Call ID must be a valid UUID')
    .optional()
    .nullable(),
});

export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>;

/**
 * Validation schema for updating a follow-up status (e.g. COMPLETED, CANCELLED)
 */
export const updateFollowUpStatusSchema = z.object({
  status: z.nativeEnum(FollowUpStatus, {
    message: 'Status must be COMPLETED or CANCELLED',
  }),
  notes: z
    .string()
    .trim()
    .max(2000, 'Notes cannot exceed 2000 characters')
    .optional()
    .nullable(),
});

export type UpdateFollowUpStatusInput = z.infer<typeof updateFollowUpStatusSchema>;

/**
 * Validation schema for rescheduling an existing pending follow-up
 */
export const rescheduleFollowUpSchema = z.object({
  dueAt: z.coerce.date({
    message: 'dueAt must be a valid ISO Date string',
  }),
  notes: z
    .string()
    .trim()
    .max(2000, 'Notes cannot exceed 2000 characters')
    .optional()
    .nullable(),
});

export type RescheduleFollowUpInput = z.infer<typeof rescheduleFollowUpSchema>;

/**
 * Validation schema for querying and filtering follow-up tasks
 */
export const queryFollowUpsSchema = z.object({
  leadId: z.string().uuid().optional(),
  executiveId: z.string().uuid().optional(),
  status: z.nativeEnum(FollowUpStatus).optional(),
  classification: z.enum(['today', 'upcoming', 'overdue', 'completed', 'cancelled']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type QueryFollowUpsInput = z.infer<typeof queryFollowUpsSchema>;
