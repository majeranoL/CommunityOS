import { z } from 'zod'

export const createUserSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required').max(50),
    middleName: z.string().max(50).optional().or(z.literal('')),
    lastName: z.string().min(1, 'Last name is required').max(50),
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    phoneNumber: z
      .string()
      .max(20)
      .regex(/^[0-9+\-\s()]*$/, 'Enter a valid phone number')
      .optional()
      .or(z.literal('')),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must include an uppercase letter')
      .regex(/[a-z]/, 'Password must include a lowercase letter')
      .regex(/[0-9]/, 'Password must include a number'),
    roleId: z.string().uuid('Select a role'),
    linkType: z.enum(['resident', 'household']),
    residentId: z.string().uuid().optional().or(z.literal('')),
    householdId: z.string().uuid().optional().or(z.literal('')),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.linkType === 'resident' && !data.residentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select a resident to link the account to.',
        path: ['residentId'],
      })
    }
    if (data.linkType === 'household' && !data.householdId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select a household to link the account to.',
        path: ['householdId'],
      })
    }
  })

export type CreateUserValues = z.infer<typeof createUserSchema>
