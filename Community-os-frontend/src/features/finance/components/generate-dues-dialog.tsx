import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DateTimePicker } from '@/components/shared/date-time-picker'
import { useGenerateAssessments } from '@/features/finance/hooks/use-finance'
import {
  generateAssessmentsSchema,
  type GenerateAssessmentsFormValues,
} from '@/features/finance/validation/finance'

interface GenerateDuesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function currentMonthPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function endOfMonthValue() {
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59)
  return end.toISOString().slice(0, 16)
}

export function GenerateDuesDialog({
  open,
  onOpenChange,
}: GenerateDuesDialogProps) {
  const generate = useGenerateAssessments()

  const form = useForm<GenerateAssessmentsFormValues>({
    resolver: zodResolver(generateAssessmentsSchema),
    defaultValues: {
      title: 'Monthly dues',
      description: '',
      period: currentMonthPeriod(),
      amount: 0,
      dueDate: endOfMonthValue(),
      remarks: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        title: 'Monthly dues',
        description: '',
        period: currentMonthPeriod(),
        amount: 0,
        dueDate: endOfMonthValue(),
        remarks: '',
      })
    }
  }, [open, form])

  const handleSubmit = (values: GenerateAssessmentsFormValues) => {
    const input = {
      title: values.title,
      description: values.description || undefined,
      period: values.period || undefined,
      amount: values.amount,
      dueDate: new Date(values.dueDate).toISOString(),
      remarks: values.remarks || undefined,
    }

    generate.mutate(input, {
      onSuccess: () => onOpenChange(false),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate monthly dues</DialogTitle>
          <DialogDescription>
            Create one assessment per active household for the selected period.
            Households with an existing assessment for the same period are
            skipped.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Monthly dues" {...field} />
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
                    <FormDescription>
                      The billing period (e.g. YYYY-MM).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What do these dues cover?"
                      rows={2}
                      {...field}
                    />
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
                        onChange={(event) =>
                          field.onChange(event.target.valueAsNumber)
                        }
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
                      <DateTimePicker
                        value={field.value}
                        onChange={field.onChange}
                      />
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
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={generate.isPending}>
                {generate.isPending ? 'Generating…' : 'Generate assessments'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
