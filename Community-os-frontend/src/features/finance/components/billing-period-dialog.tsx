import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { DateTimePicker } from '@/components/shared/date-time-picker'
import { useCreateBillingPeriod, useGenerateBillingPeriods } from '@/features/finance/hooks/use-finance'
import {
  billingPeriodSchema,
  generateBillingPeriodsSchema,
  type BillingPeriodFormValues,
  type GenerateBillingPeriodsFormValues,
} from '@/features/finance/validation/finance'
import { ChargeTypeSelect } from '@/features/finance/components/selects'

interface BillingPeriodDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function nextMonthPeriod(): string {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
}

export function BillingPeriodDialog({ open, onOpenChange }: BillingPeriodDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? <BillingPeriodDialogContent onOpenChange={onOpenChange} /> : null}
    </Dialog>
  )
}

function BillingPeriodDialogContent({
  onOpenChange,
}: {
  onOpenChange: (open: boolean) => void
}) {
  const [mode, setMode] = useState<'create' | 'generate'>('create')
  const create = useCreateBillingPeriod()
  const generate = useGenerateBillingPeriods()

  const createForm = useForm<BillingPeriodFormValues>({
    resolver: zodResolver(billingPeriodSchema),
    defaultValues: {
      chargeTypeId: '',
      periodKey: nextMonthPeriod(),
      label: '',
      dueDate: '',
      amount: undefined,
    },
  })

  const generateForm = useForm<GenerateBillingPeriodsFormValues>({
    resolver: zodResolver(generateBillingPeriodsSchema),
    defaultValues: {
      chargeTypeId: '',
      periodKey: nextMonthPeriod(),
      months: 1,
      dueDate: '',
      amount: undefined,
    },
  })

  const handleCreate = (values: BillingPeriodFormValues) => {
    create.mutate(
      {
        chargeTypeId: values.chargeTypeId,
        periodKey: values.periodKey,
        label: values.label || undefined,
        dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : undefined,
        amount: values.amount,
      },
      { onSuccess: () => onOpenChange(false) },
    )
  }

  const handleGenerate = (values: GenerateBillingPeriodsFormValues) => {
    generate.mutate(
      {
        chargeTypeId: values.chargeTypeId,
        periodKey: values.periodKey,
        months: values.months,
        dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : undefined,
        amount: values.amount,
      },
      { onSuccess: () => onOpenChange(false) },
    )
  }

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Billing periods</DialogTitle>
          <DialogDescription>
            Create a single period or generate several future months for a recurring charge.
          </DialogDescription>
        </DialogHeader>
        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as 'create' | 'generate')}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create one</TabsTrigger>
            <TabsTrigger value="generate">Generate months</TabsTrigger>
          </TabsList>

          {mode === 'create' ? (
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreate)} className="mt-4 space-y-4">
                <FormField
                  control={createForm.control}
                  name="chargeTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Charge type</FormLabel>
                      <FormControl>
                        <ChargeTypeSelect value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={createForm.control}
                    name="periodKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Period</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 2026-09" {...field} />
                        </FormControl>
                        <FormDescription>YYYY-MM</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Label</FormLabel>
                        <FormControl>
                          <Input placeholder="Optional" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={createForm.control}
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
                            value={field.value ?? ''}
                            onChange={(event) => field.onChange(event.target.valueAsNumber)}
                          />
                        </FormControl>
                        <FormDescription>Defaults to the charge type amount.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due date</FormLabel>
                        <FormControl>
                          <DateTimePicker value={field.value ?? ''} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={create.isPending}>
                    {create.isPending ? 'Creating…' : 'Create period'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          ) : (
            <Form {...generateForm}>
              <form onSubmit={generateForm.handleSubmit(handleGenerate)} className="mt-4 space-y-4">
                <FormField
                  control={generateForm.control}
                  name="chargeTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Charge type</FormLabel>
                      <FormControl>
                        <ChargeTypeSelect value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={generateForm.control}
                    name="periodKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Starting period</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 2026-09" {...field} />
                        </FormControl>
                        <FormDescription>YYYY-MM</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={generateForm.control}
                    name="months"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Months</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="36"
                            value={field.value || ''}
                            onChange={(event) => field.onChange(event.target.valueAsNumber)}
                          />
                        </FormControl>
                        <FormDescription>1 to 36 future months.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={generateForm.control}
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
                            value={field.value ?? ''}
                            onChange={(event) => field.onChange(event.target.valueAsNumber)}
                          />
                        </FormControl>
                        <FormDescription>Defaults to the charge type amount.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={generateForm.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due date</FormLabel>
                        <FormControl>
                          <DateTimePicker value={field.value ?? ''} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={generate.isPending}>
                    {generate.isPending ? 'Generating…' : 'Generate periods'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </Tabs>
      </DialogContent>
  )
}
