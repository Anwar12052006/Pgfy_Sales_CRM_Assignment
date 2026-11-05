import { z } from 'zod';
import { CallOutcome } from '../config/prisma.js';

/**
 * Validation schema for recording an outbound call
 */
export const recordCallSchema = z.object({
  leadId: z.string().uuid('Lead ID must be a valid UUID'),
  callDateTime: z.coerce.date().optional(),
  durationSeconds: z.coerce
    .number()
    .int('Duration must be an integer')
    .min(0, 'Duration in seconds must be non-negative'),
  outcome: z.nativeEnum(CallOutcome, {
    message: 'Invalid call outcome. Must be a recognized CallOutcome value',
  }),
  notes: z
    .string()
    .trim()
    .max(2000, 'Notes cannot exceed 2000 characters')
    .optional()
    .nullable(),
  // Optional follow-up scheduling
  nextFollowUpDate: z.coerce
    .date()
    .optional()
    .nullable(),
  nextFollowUpNotes: z
    .string()
    .trim()
    .max(1000, 'Follow-up notes cannot exceed 1000 characters')
    .optional()
    .nullable(),
});

export type RecordCallInput = z.infer<typeof recordCallSchema>;

/**
 * Validation schema for querying and filtering call logs
 */
export const queryCallsSchema = z.object({
  leadId: z.string().uuid().optional(),
  executiveId: z.string().uuid().optional(),
  outcome: z.nativeEnum(CallOutcome).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type QueryCallsInput = z.infer<typeof queryCallsSchema>;
