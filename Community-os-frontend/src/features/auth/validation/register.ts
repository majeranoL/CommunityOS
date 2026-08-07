import { z } from 'zod'

const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Enter a valid email address')

const passwordSchema = z
  .string()
  .min(1, 'Password is required')
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[0-9]/, 'Password must include a number')

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required').max(50),
    middleName: z.string().max(50).optional().or(z.literal('')),
    lastName: z.string().min(1, 'Last name is required').max(50),
    email: emailSchema,
    phoneNumber: z
      .string()
      .max(20)
      .regex(/^[0-9+\-\s()]*$/, 'Enter a valid phone number')
      .optional()
      .or(z.literal('')),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password'),
    communityId: z.string().uuid('Select your community'),
    block: z.string().max(20).optional().or(z.literal('')),
    lot: z.string().max(20).optional().or(z.literal('')),
    unit: z.string().max(20).optional().or(z.literal('')),
    address: z.string().max(255).optional().or(z.literal('')),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine(
    (values) => Boolean(values.block || values.lot || values.unit || values.address),
    {
      message: 'Provide at least one of block, lot, unit, or address',
      path: ['unit'],
    },
  )

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>
