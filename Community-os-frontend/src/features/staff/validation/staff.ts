import { z } from 'zod'

export const staffFormSchema = z.object({
  staffNumber: z.string().trim().min(1, 'Staff number is required').max(30),
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  middleName: z.string().trim().max(100).optional().or(z.literal('')),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  role: z.string().optional().or(z.literal('')),
  phoneNumber: z.string().trim().max(20).optional().or(z.literal('')),
  email: z.string().trim().max(255).optional().or(z.literal('')),
  hireDate: z.string().optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
})

export type StaffFormValues = z.infer<typeof staffFormSchema>
