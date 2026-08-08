import { z } from 'zod'

export const visitorFormSchema = z.object({
  name: z.string().trim().min(1, 'Visitor name is required').max(100),
  phoneNumber: z.string().trim().max(20).optional().or(z.literal('')),
  purpose: z.string().trim().max(255).optional().or(z.literal('')),
  hostResidentId: z.string().optional().or(z.literal('')),
  vehiclePlate: z.string().trim().max(20).optional().or(z.literal('')),
  remarks: z.string().trim().max(1000).optional().or(z.literal('')),
})

export type VisitorFormValues = z.infer<typeof visitorFormSchema>
