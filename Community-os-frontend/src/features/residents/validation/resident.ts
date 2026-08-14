import { z } from 'zod'

export const residentFormSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  middleName: z.string().trim().max(50).optional().or(z.literal('')),
  lastName: z.string().trim().min(1, 'Last name is required'),
  suffix: z.string().trim().max(10).optional().or(z.literal('')),
  birthDate: z.string().optional().or(z.literal('')),
  gender: z.string().optional().or(z.literal('')),
  civilStatus: z.string().optional().or(z.literal('')),
  phoneNumber: z.string().trim().max(20).optional().or(z.literal('')),
  email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
  householdId: z.string().optional().or(z.literal('')),
  residentType: z.string().optional().or(z.literal('')),
  block: z.string().trim().max(20).optional().or(z.literal('')),
  lot: z.string().trim().max(20).optional().or(z.literal('')),
  street: z.string().trim().max(100).optional().or(z.literal('')),
  address: z.string().trim().max(255).optional().or(z.literal('')),
  remarks: z.string().trim().max(1000).optional().or(z.literal('')),
})

export type ResidentFormValues = z.infer<typeof residentFormSchema>
