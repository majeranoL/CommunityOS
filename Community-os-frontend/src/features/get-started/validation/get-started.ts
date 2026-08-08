import { z } from 'zod'

export const getStartedSchema = z
  .object({
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
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    ownerEmail: z.string().min(1, 'Email is required').email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Password must contain at least one letter and one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type GetStartedValues = z.infer<typeof getStartedSchema>

export const communityStepSchema = getStartedSchema.pick([
  'displayName',
  'description',
  'email',
  'contactNumber',
  'address',
  'planId',
])

export const accountStepSchema = getStartedSchema.pick([
  'firstName',
  'lastName',
  'ownerEmail',
  'password',
  'confirmPassword',
])
