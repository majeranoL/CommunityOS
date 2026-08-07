import { z } from 'zod'

export const facilityTypes = [
  { value: 'CLUBHOUSE', label: 'Clubhouse' },
  { value: 'FUNCTION_ROOM', label: 'Function room' },
  { value: 'POOL', label: 'Pool' },
  { value: 'GYM', label: 'Gym' },
  { value: 'COURT', label: 'Court' },
  { value: 'PARK', label: 'Park' },
  { value: 'PLAYGROUND', label: 'Playground' },
  { value: 'GARDEN', label: 'Garden' },
  { value: 'OTHER', label: 'Other' },
] as const

export const facilityStatuses = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'CLOSED', label: 'Closed' },
] as const

export const facilitySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.string().min(1, 'Type is required'),
  description: z.string().optional().or(z.literal('')),
  location: z.string().max(200).optional().or(z.literal('')),
  capacity: z.string().optional().or(z.literal('')),
  imageUrl: z.string().url('Enter a valid image URL').optional().or(z.literal('')),
  hourlyRate: z.string().optional().or(z.literal('')),
  status: z.string().min(1, 'Status is required'),
})

export type FacilityFormValues = z.infer<typeof facilitySchema>
