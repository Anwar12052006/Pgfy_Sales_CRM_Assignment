import { z } from 'zod';
import { LeadStatus } from '../config/prisma.js';

/**
 * Validates Indian 10-digit mobile number format.
 * Accepts formats like: 9876543210, +919876543210, +91 9876543210, 09876543210
 * Normalizes to standard 10-digit string.
 */
export const indianMobileSchema = z
  .string()
  .trim()
  .refine(
    (val) => {
      const digits = val.replace(/\D/g, '');
      if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) return true;
      if (digits.length === 11 && digits.startsWith('0') && /^[6-9]\d{9}$/.test(digits.slice(1))) return true;
      if (digits.length === 12 && digits.startsWith('91') && /^[6-9]\d{9}$/.test(digits.slice(2))) return true;
      return false;
    },
    {
      message: 'Mobile number must be a valid 10-digit Indian number starting with 6-9 (e.g. 9876543210)',
    }
  )
  .transform((val) => {
    const digits = val.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
    return digits;
  });

/**
 * Schema for creating a new lead (Admin only)
 */
export const createLeadSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, 'Customer name must be at least 2 characters')
    .max(150, 'Customer name cannot exceed 150 characters'),
  mobileNumber: indianMobileSchema,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email address')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
  propertyCategory: z
    .string()
    .trim()
    .min(2, 'Property category is required')
    .max(100),
  preferredLocation: z
    .string()
    .trim()
    .min(2, 'Preferred location is required')
    .max(255),
  budget: z.coerce
    .number()
    .positive('Budget must be a positive number in INR'),
  leadSource: z
    .string()
    .trim()
    .min(1, 'Lead source is required')
    .max(100),
  status: z
    .nativeEnum(LeadStatus, { message: 'Invalid lead status' })
    .optional()
    .default(LeadStatus.NEW),
  enquiryDate: z.coerce.date().optional(),
  assignedExecutiveId: z
    .string()
    .uuid('Assigned executive ID must be a valid UUID')
    .optional()
    .nullable(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;

/**
 * Schema for updating general lead info (Admin only)
 */
export const updateLeadSchema = z.object({
  customerName: z.string().trim().min(2).max(150).optional(),
  mobileNumber: indianMobileSchema.optional(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email address')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
  propertyCategory: z.string().trim().min(2).max(100).optional(),
  preferredLocation: z.string().trim().min(2).max(255).optional(),
  budget: z.coerce.number().positive('Budget must be positive').optional(),
  leadSource: z.string().trim().min(1).max(100).optional(),
  status: z.nativeEnum(LeadStatus, { message: 'Invalid lead status' }).optional(),
  enquiryDate: z.coerce.date().optional(),
});

export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

/**
 * Schema for updating lead status
 */
export const updateLeadStatusSchema = z.object({
  status: z.nativeEnum(LeadStatus, { message: 'Invalid lead status value' }),
});

export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;

/**
 * Schema for assigning or reassigning lead (Admin only)
 */
export const assignLeadSchema = z.object({
  executiveId: z
    .string()
    .uuid('Executive ID must be a valid UUID'),
});

export type AssignLeadInput = z.infer<typeof assignLeadSchema>;

/**
 * Schema for filtering and searching leads
 */
export const queryLeadsSchema = z.object({
  search: z.string().trim().optional(),
  status: z.nativeEnum(LeadStatus, { message: 'Invalid lead status' }).optional(),
  executiveId: z.string().uuid().optional(),
  assigned: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type QueryLeadsInput = z.infer<typeof queryLeadsSchema>;
