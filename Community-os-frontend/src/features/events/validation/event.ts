import { z } from 'zod'

export const eventSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().optional().or(z.literal('')),
    location: z.string().max(200).optional().or(z.literal('')),
    startAt: z.string().min(1, 'Start date and time are required'),
    endAt: z.string().optional().or(z.literal('')),
    coverImageUrl: z.string().url('Enter a valid image URL').optional().or(z.literal('')),
    category: z.string(),
    publish: z.boolean(),
  })
  .refine((values) => !values.endAt || new Date(values.endAt) > new Date(values.startAt), {
    message: 'End time must be after start time.',
    path: ['endAt'],
  })

export type EventFormValues = z.infer<typeof eventSchema>
