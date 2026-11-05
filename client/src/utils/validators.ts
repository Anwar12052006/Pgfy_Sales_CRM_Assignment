import { z } from 'zod';
import { LeadStatus } from '@/types';

export const indianMobileRegex = /^[6-9]\d{9}$/;

export const leadFormSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, 'Customer name must be at least 2 characters')
    .max(150, 'Customer name cannot exceed 150 characters'),
  mobileNumber: z
    .string()
    .trim()
    .refine(
      (val) => {
        const clean = val.replace(/\D/g, '');
        return clean.length === 10 && indianMobileRegex.test(clean);
      },
      {
        message: 'Must be a valid 10-digit Indian mobile number (e.g. 9876543210)',
      }
    ),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email address format')
    .optional()
    .or(z.literal('')),
  propertyCategory: z
    .string()
    .trim()
    .min(1, 'Property category is required'),
  preferredLocation: z
    .string()
    .trim()
    .min(2, 'Preferred location is required'),
  budget: z
    .coerce
    .number({ message: 'Budget must be a valid number' })
    .positive('Budget must be greater than 0'),
  leadSource: z
    .string()
    .trim()
    .min(1, 'Lead source is required'),
  status: z
    .nativeEnum(LeadStatus)
    .optional(),
  assignedExecutiveId: z
    .string()
    .optional()
    .nullable(),
});

export type LeadFormData = z.infer<typeof leadFormSchema>;
