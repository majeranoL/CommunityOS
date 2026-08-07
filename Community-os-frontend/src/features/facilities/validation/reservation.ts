import { z } from 'zod'

export const reservationSchema = z
  .object({
    facilityId: z.string().min(1, 'Select a facility'),
    residentId: z.string().min(1, 'Select a resident'),
    purpose: z.string().optional().or(z.literal('')),
    startAt: z.string().min(1, 'Start time is required'),
    endAt: z.string().min(1, 'End time is required'),
    remarks: z.string().optional().or(z.literal('')),
  })
  .refine((values) => !values.startAt || !values.endAt || new Date(values.endAt) > new Date(values.startAt), {
    message: 'End time must be after the start time.',
    path: ['endAt'],
  })
  .refine((values) => !values.startAt || new Date(values.startAt) > new Date(), {
    message: 'Reservation start time cannot be in the past.',
    path: ['startAt'],
  })

export type ReservationFormValues = z.infer<typeof reservationSchema>
