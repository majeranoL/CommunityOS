import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DateTimePicker } from '@/components/shared/date-time-picker'
import { useCreateEvent, useUpdateEvent } from '@/features/events/hooks/use-events'
import { eventSchema, type EventFormValues } from '@/features/events/validation/event'
import type { CommunityEvent } from '@/features/events/types/event'
import { formatDate } from '@/lib/format'

interface EventFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event?: CommunityEvent | null
}

function toLocalInputValue(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function EventFormDialog({ open, onOpenChange, event }: EventFormDialogProps) {
  const isEdit = Boolean(event)
  const createEvent = useCreateEvent()
  const updateEvent = useUpdateEvent()

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      startAt: '',
      endAt: '',
      coverImageUrl: '',
      publish: false,
    },
  })

  const startAtValue = form.watch('startAt')
  const minEndAt = startAtValue ? new Date(startAtValue) : undefined

  useEffect(() => {
    if (open) {
      form.reset({
        title: event?.title ?? '',
        description: event?.description ?? '',
        location: event?.location ?? '',
        startAt: event ? toLocalInputValue(event.startAt) : '',
        endAt: event ? toLocalInputValue(event.endAt) : '',
        coverImageUrl: event?.coverImageUrl ?? '',
        publish: false,
      })
    }
  }, [open, event, form])

  const handleSubmit = (values: EventFormValues) => {
    const input = {
      title: values.title,
      description: values.description || undefined,
      location: values.location || undefined,
      startAt: new Date(values.startAt).toISOString(),
      endAt: values.endAt ? new Date(values.endAt).toISOString() : undefined,
      coverImageUrl: values.coverImageUrl || undefined,
      ...(isEdit
        ? event?.status === 'DRAFT'
          ? { status: values.publish ? ('PUBLISHED' as const) : undefined }
          : {}
        : { status: values.publish ? ('PUBLISHED' as const) : ('DRAFT' as const) }),
    }

    if (isEdit && event) {
      updateEvent.mutate(
        { id: event.id, input },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      createEvent.mutate(input, { onSuccess: () => onOpenChange(false) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit event' : 'New event'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Last updated ${formatDate(event?.updatedAt)}.`
              : 'Plan an activity for your community.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Zumba at the Clubhouse" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="What should residents expect?" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Clubhouse, Function Room A" {...field} />
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
                      <DateTimePicker value={field.value ?? ''} onChange={field.onChange} minDate={minEndAt} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="coverImageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cover image URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://… (optional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!isEdit || event?.status === 'DRAFT' ? (
              <FormField
                control={form.control}
                name="publish"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Publish immediately</FormLabel>
                      <FormDescription>Make this event visible to residents now.</FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createEvent.isPending || updateEvent.isPending}>
                {isEdit ? 'Save changes' : 'Create event'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
