import { z } from 'zod'

export const billingCycles = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
] as const

export const planSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .max(50)
    .transform((value) => value.trim().toLowerCase()),
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  price: z
    .string()
    .min(1, 'Price is required')
    .refine((value) => Number(value) >= 0, 'Price cannot be negative'),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']),
  maxUsers: z
    .string()
    .min(1, 'Max users is required')
    .refine((value) => Number(value) >= 1, 'Must be at least 1'),
  maxResidents: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((value) => value === '' || Number(value) >= 0, 'Cannot be negative'),
  sortOrder: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((value) => value === '' || Number.isInteger(Number(value)), 'Must be a whole number'),
  featuresText: z.string().optional().or(z.literal('')),
  isActive: z.boolean(),
})

export type PlanFormValues = z.infer<typeof planSchema>
