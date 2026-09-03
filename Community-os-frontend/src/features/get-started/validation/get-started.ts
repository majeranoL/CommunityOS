import { z } from 'zod'

const communityFields = {
  displayName: z.string().min(2, 'Community name is required'),
  description: z.string().optional(),
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
  contactNumber: z.string().optional(),
  address: z.string().optional(),
  planId: z.string().min(1, 'Please select a plan'),
} satisfies Record<string, z.ZodTypeAny>

const accountFields = {
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  ownerEmail: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Password must contain at least one letter and one number'),
  confirmPassword: z.string(),
} satisfies Record<string, z.ZodTypeAny>

export const communityStepSchema = z.object(communityFields)
export const accountStepSchema = z.object(accountFields)

export const getStartedSchema = z
  .object({ ...communityFields, ...accountFields })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type GetStartedValues = z.infer<typeof getStartedSchema>
