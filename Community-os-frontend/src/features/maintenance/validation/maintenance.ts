import { z } from 'zod'

export const maintenanceFormSchema = z.object({
  maintenanceNumber: z.string().trim().min(1, 'Maintenance number is required').max(30),
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  category: z.string().min(1, 'Category is required'),
  priority: z.string().optional().or(z.literal('')),
  facilityId: z.string().optional().or(z.literal('')),
  assignedToId: z.string().optional().or(z.literal('')),
  cost: z.string().optional().or(z.literal('')),
  scheduledAt: z.string().optional().or(z.literal('')),
  remarks: z.string().trim().max(1000).optional().or(z.literal('')),
})

export type MaintenanceFormValues = z.infer<typeof maintenanceFormSchema>
