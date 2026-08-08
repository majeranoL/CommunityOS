import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DateTimePicker } from '@/components/shared/date-time-picker'
import { useCreateAssessment, useUpdateAssessment } from '@/features/finance/hooks/use-finance'
import { assessmentSchema, type AssessmentFormValues } from '@/features/finance/validation/finance'
import { HouseholdSelect } from '@/features/finance/components/household-select'
import type { AssessmentListItem } from '@/features/finance/types/finance'

interface AssessmentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assessment?: AssessmentListItem | null
}

export function AssessmentFormDialog({ open, onOpenChange, assessment }: AssessmentFormDialogProps) {
  const isEdit = Boolean(assessment)
  const createAssessment = useCreateAssessment()
  const updateAssessment = useUpdateAssessment()

  const form = useForm<AssessmentFormValues>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      assessmentNumber: '',
      title: '',
      description: '',
      householdId: '',
      amount: 0,
      dueDate: '',
      period: '',
      remarks: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        assessmentNumber: assessment?.assessmentNumber ?? '',
        title: assessment?.title ?? '',
        description: assessment?.description ?? '',
        householdId: assessment?.householdId ?? '',
        amount: assessment ? Number(assessment.amount) : 0,
        dueDate: assessment?.dueDate ? new Date(assessment.dueDate).toISOString().slice(0, 16) : '',
        period: assessment?.period ?? '',
        remarks: assessment?.remarks ?? '',
      })
    }
  }, [open, assessment, form])

  const handleSubmit = (values: AssessmentFormValues) => {
    const input = {
      assessmentNumber: values.assessmentNumber,
      title: values.title,
      description: values.description || undefined,
      householdId: values.householdId,
      amount: values.amount,
      dueDate: new Date(values.dueDate).toISOString(),
      period: values.period || undefined,
      remarks: values.remarks || undefined,
    }

    if (isEdit && assessment) {
      updateAssessment.mutate(
        { id: assessment.id, input },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      createAssessment.mutate(input, { onSuccess: () => onOpenChange(false) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit assessment' : 'New assessment'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the dues details for this household.'
              : 'Create a dues or fee assessment for a household.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="assessmentNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assessment number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. ASMT-0001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 2026-08" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. August monthly dues" {...field} />
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
                    <Textarea placeholder="What does this assessment cover?" rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="householdId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Household</FormLabel>
                  <FormControl>
                    <HouseholdSelect value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={field.value || ''}
                      onChange={(event) => field.onChange(event.target.valueAsNumber)}
                    />
                    </FormControl>
                    <FormDescription>In PHP.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due date</FormLabel>
                    <FormControl>
                      <DateTimePicker value={field.value} onChange={field.onChange} />
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
                    <Input placeholder="Optional notes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createAssessment.isPending || updateAssessment.isPending}>
                {isEdit ? 'Save changes' : 'Create assessment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
