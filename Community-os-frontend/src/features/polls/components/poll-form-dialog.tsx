import { useEffect } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCreatePoll, useUpdatePoll } from '@/features/polls/hooks/use-polls'
import { pollSchema, type PollFormValues } from '@/features/polls/validation/poll'
import type { PollListItem } from '@/features/polls/types/poll'

interface PollFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  poll?: PollListItem | null
}

export function PollFormDialog({ open, onOpenChange, poll }: PollFormDialogProps) {
  const isEdit = Boolean(poll)
  const createPoll = useCreatePoll()
  const updatePoll = useUpdatePoll()

  const form = useForm<PollFormValues>({
    resolver: zodResolver(pollSchema),
    defaultValues: {
      title: '',
      description: '',
      options: [{ value: '' }, { value: '' }],
      isAnonymous: false,
      allowMultiple: false,
      allowAddOptions: false,
      endAt: '',
      publish: false,
    },
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'options' })

  useEffect(() => {
    if (open) {
      form.reset({
        title: poll?.title ?? '',
        description: poll?.description ?? '',
        options: poll?.options.length ? poll.options.map((option) => ({ value: option.text })) : [{ value: '' }, { value: '' }],
        isAnonymous: poll?.isAnonymous ?? false,
        allowMultiple: poll?.allowMultiple ?? false,
        allowAddOptions: poll?.allowAddOptions ?? false,
        endAt: poll?.endAt ? poll.endAt.slice(0, 16) : '',
        publish: false,
      })
    }
  }, [open, poll, form])

  const handleSubmit = (values: PollFormValues) => {
    const input = {
      title: values.title,
      description: values.description || undefined,
      isAnonymous: values.isAnonymous,
      allowMultiple: values.allowMultiple,
      allowAddOptions: values.allowAddOptions,
      endAt: values.endAt ? new Date(values.endAt).toISOString() : undefined,
      options: values.options.map((option) => option.value.trim()).filter(Boolean),
      ...(isEdit
        ? poll?.status === 'DRAFT'
          ? { status: values.publish ? ('OPEN' as const) : undefined }
          : {}
        : { status: values.publish ? ('OPEN' as const) : ('DRAFT' as const) }),
    }

    if (isEdit && poll) {
      updatePoll.mutate(
        { id: poll.id, input },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      createPoll.mutate(input, { onSuccess: () => onOpenChange(false) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit poll' : 'New poll'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the question and options.' : 'Ask your community for their input.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Which day works best for the general assembly?" {...field} />
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
                    <Textarea placeholder="Optional context…" rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel className="mb-2 block">Options</FormLabel>
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <FormField
                    key={field.id}
                    control={form.control}
                    name={`options.${index}.value`}
                    render={({ field: optionField }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input placeholder={`Option ${index + 1}`} {...optionField} />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              disabled={fields.length <= 2}
                              onClick={() => remove(index)}
                            >
                              <X className="h-4 w-4" />
                              <span className="sr-only">Remove option</span>
                            </Button>
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                disabled={fields.length >= 20}
                onClick={() => append({ value: '' })}
              >
                <Plus className="h-4 w-4" />
                Add option
              </Button>
              {form.formState.errors.options ? (
                <p className="mt-1 text-sm font-medium text-destructive">
                  {form.formState.errors.options.message ?? (form.formState.errors.options.root as { message?: string } | undefined)?.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2 rounded-md border p-3">
              <FormField
                control={form.control}
                name="allowMultiple"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Allow multiple selections</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isAnonymous"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Anonymous responses</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="allowAddOptions"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Let residents add options</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="endAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Voting ends</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormDescription>Leave empty to keep the poll open until closed manually.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEdit || poll?.status === 'DRAFT' ? (
              <FormField
                control={form.control}
                name="publish"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Open for voting now</FormLabel>
                      <FormDescription>Skip the draft and start collecting votes.</FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPoll.isPending || updatePoll.isPending}>
                {isEdit ? 'Save changes' : 'Create poll'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
