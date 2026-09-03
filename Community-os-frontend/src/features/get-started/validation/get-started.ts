import { z } from 'zod'

const communityFields = {
  displayName: z.string().min(2, 'Community name is required'),
  description: z.string().optional(),
  email: z.string().email('Invalid email address'),
  contactNumber: z.string().optional(),
  address: z
    .string()
    .trim()
    .min(10, 'Please provide a complete community address (street, city, and province).')
    .max(255),
  planId: z.string().min(1, 'Please select a plan'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Password must contain at least one letter and one number'),
  confirmPassword: z.string(),
} satisfies Record<string, z.ZodTypeAny>

const ownerFields = {
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  ownerEmail: z
    .string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
  phoneNumber: z.string().optional(),
  block: z.string().trim().max(20).optional().or(z.literal('')),
  lot: z.string().trim().max(20).optional().or(z.literal('')),
  unit: z.string().trim().max(20).optional().or(z.literal('')),
  homeAddress: z.string().trim().max(255).optional().or(z.literal('')),
} satisfies Record<string, z.ZodTypeAny>

export const communityStepSchema = z.object(communityFields)

export const ownerInfoStepSchema = z
  .object(ownerFields)
  .refine((values) => Boolean(values.block || values.lot || values.unit || values.homeAddress), {
    message: 'Provide at least one of block, lot, unit, or address',
    path: ['block'],
  })

export const getStartedSchema = z
  .object({ ...communityFields, ...ownerFields })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type GetStartedValues = z.infer<typeof getStartedSchema>
