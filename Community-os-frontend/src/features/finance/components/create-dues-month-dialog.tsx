import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
import { DateTimePicker } from '@/components/shared/date-time-picker'
import { useChargeTypes, useCreateDuesMonth } from '@/features/finance/hooks/use-finance'

const createDuesMonthSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Pick a month (e.g. 2026-08).'),
  amount: z
    .number({ error: 'Enter an amount' })
    .positive('Amount must be greater than zero.'),
  dueDate: z.string().min(1, 'Set a due date.'),
})

type CreateDuesMonthValues = z.infer<typeof createDuesMonthSchema>

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function dueDateForMonth(dueDay: number | null | undefined, month: string) {
  const [year, monthNumber] = month.split('-').map((part) => parseInt(part, 10))
  const lastDay = new Date(year, monthNumber, 0).getDate()
  const day = Math.min(dueDay ?? lastDay, lastDay)
  const date = new Date(year, monthNumber - 1, day, 23, 59)
  return date.toISOString().slice(0, 16)
}

interface CreateDuesMonthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateDuesMonthDialog({
  open,
  onOpenChange,
}: CreateDuesMonthDialogProps) {
  const create = useCreateDuesMonth(() => onOpenChange(false))
  const { data: chargeTypeData } = useChargeTypes({ category: 'DUES', limit: 50 })
  const duesChargeType =
    chargeTypeData?.items.find((item) => item.isActive) ?? chargeTypeData?.items[0]

  const defaultAmount = Number(duesChargeType?.amount ?? 0)

  const form = useForm<CreateDuesMonthValues>({
    resolver: zodResolver(createDuesMonthSchema),
    defaultValues: {
      month: currentMonth(),
      amount: defaultAmount || undefined,
      dueDate: dueDateForMonth(duesChargeType?.dueDay, currentMonth()),
    },
  })

  const [initializedFor, setInitializedFor] = useState<string | null>(null)

  useEffect(() => {
    if (!open || initializedFor === String(defaultAmount)) return
    form.reset({
      month: currentMonth(),
      amount: defaultAmount || undefined,
      dueDate: dueDateForMonth(duesChargeType?.dueDay, currentMonth()),
    })
    setInitializedFor(String(defaultAmount))
  }, [open, defaultAmount, duesChargeType?.dueDay, form, initializedFor])

  const selectedMonth = form.watch('month')

  useEffect(() => {
    if (!selectedMonth || !/^\d{4}-(0[1-9]|1[0-2])$/.test(selectedMonth)) return
    form.setValue('dueDate', dueDateForMonth(duesChargeType?.dueDay, selectedMonth))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth])

  const handleSubmit = (values: CreateDuesMonthValues) => {
    create.mutate({
      month: values.month,
      amount: values.amount,
      dueDate: new Date(values.dueDate).toISOString(),
    })
  }

  const householdCountHint =
    duesChargeType == null
      ? 'No monthly dues settings yet — a "Monthly Dues" charge type will be created automatically.'
      : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New monthly dues</DialogTitle>
          <DialogDescription>
            Creates one bill per active household for the chosen month.
            Households already billed for that month are skipped.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="month"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Month</FormLabel>
                  <FormControl>
                    <Input type="month" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount per household</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={field.value ?? ''}
                      onChange={(event) =>
                        field.onChange(event.target.valueAsNumber)
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    {householdCountHint ??
                      `Prefilled from your dues settings (${duesChargeType?.name}).`}
                  </FormDescription>
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
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending
                  ? 'Creating…'
                  : `Create ${selectedMonth || 'dues'}`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
