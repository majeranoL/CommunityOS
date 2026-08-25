import { z } from 'zod'

export const CATEGORY_OPTIONS = [
  { value: 'SECURITY', label: 'Security' },
  { value: 'NOISE', label: 'Noise' },
  { value: 'SANITATION', label: 'Sanitation' },
  { value: 'PARKING', label: 'Parking' },
  { value: 'PETS', label: 'Pets' },
  { value: 'FACILITY', label: 'Facility' },
  { value: 'UTILITIES', label: 'Utilities' },
  { value: 'NEIGHBOR', label: 'Neighbor' },
  { value: 'OTHER', label: 'Other' },
] as const

export const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
] as const

export const complaintSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Describe the issue'),
  category: z.enum(['SECURITY', 'NOISE', 'SANITATION', 'PARKING', 'PETS', 'FACILITY', 'UTILITIES', 'NEIGHBOR', 'OTHER']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  remarks: z.string().optional().or(z.literal('')),
  attachmentFileIds: z.array(z.string()).optional(),
})

export type ComplaintFormValues = z.infer<typeof complaintSchema>
