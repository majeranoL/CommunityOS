import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DateTimePicker } from '@/components/shared/date-time-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateReservation } from '@/features/facilities/hooks/use-reservations'
import { useFacilities } from '@/features/facilities/hooks/use-facilities'
import { ResidentSelect } from '@/features/facilities/components/resident-select'
import { reservationSchema, type ReservationFormValues } from '@/features/facilities/validation/reservation'
import { useAuthStore } from '@/store/auth-store'
import { toTitleCase } from '@/lib/format'

interface ReservationFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReservationFormDialog({ open, onOpenChange }: ReservationFormDialogProps) {
  const createReservation = useCreateReservation()
  const { data: facilities } = useFacilities({ page: 1, limit: 100 })
  const user = useAuthStore((state) => state.user)
  const selfResidentId = user?.resident?.id

  const form = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      facilityId: '',
      residentId: '',
      purpose: '',
      startAt: '',
      endAt: '',
      remarks: '',
    },
  })

  useEffect(() => {
    if (open)
      form.reset({
        facilityId: '',
        residentId: selfResidentId ?? '',
        purpose: '',
        startAt: '',
        endAt: '',
        remarks: '',
      })
  }, [open, form, selfResidentId])

  const startAtValue = form.watch('startAt')
  const minEndAt = startAtValue ? new Date(startAtValue) : undefined

  const handleSubmit = (values: ReservationFormValues) => {
    createReservation.mutate(
      {
        facilityId: values.facilityId,
        residentId: values.residentId,
        purpose: values.purpose || undefined,
        startAt: new Date(values.startAt).toISOString(),
        endAt: new Date(values.endAt).toISOString(),
        remarks: values.remarks || undefined,
      },
      { onSuccess: () => onOpenChange(false) },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New reservation</DialogTitle>
          <DialogDescription>Book a facility for a resident.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="facilityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Facility</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a facility" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {facilities?.items.map((facility) => (
                        <SelectItem
                          key={facility.id}
                          value={facility.id}
                          disabled={facility.status === 'CLOSED' || facility.status === 'MAINTENANCE'}
                        >
                          {facility.name} · {toTitleCase(facility.type)}
                          {facility.status === 'MAINTENANCE' ? ' (under maintenance)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="residentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resident</FormLabel>
                  <FormControl>
                    <ResidentSelect
                      value={field.value}
                      onChange={field.onChange}
                      disabled={Boolean(selfResidentId)}
                    />
                  </FormControl>
                  {selfResidentId ? (
                    <FormDescription>Booked under your name.</FormDescription>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purpose</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Birthday party" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Starts</FormLabel>
                    <FormControl>
                      <DateTimePicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ends</FormLabel>
                    <FormControl>
                      <DateTimePicker value={field.value} onChange={field.onChange} minDate={minEndAt} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional notes…" rows={3} {...field} />
                  </FormControl>
                  <FormDescription>Submissions start as PENDING and need approval.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createReservation.isPending}>
                Submit reservation
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
