import { z } from 'zod'

export const announcementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required'),
  coverImageUrl: z.string().url('Enter a valid image URL').optional().or(z.literal('')),
  publish: z.boolean(),
})

export type AnnouncementFormValues = z.infer<typeof announcementSchema>
