import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateChargeType, useUpdateChargeType } from '@/features/finance/hooks/use-finance'
import { chargeTypeSchema, CHARGE_RECURRENCES, FINANCE_CATEGORIES, type ChargeTypeFormValues } from '@/features/finance/validation/finance'
import { toTitleCase } from '@/lib/format'
import type { ChargeRecurrence, ChargeType, FinanceCategory } from '@/features/finance/types/finance'

interface ChargeTypeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  chargeType?: ChargeType | null
}

export function ChargeTypeFormDialog({ open, onOpenChange, chargeType }: ChargeTypeFormDialogProps) {
  const isEdit = Boolean(chargeType)
  const create = useCreateChargeType()
  const update = useUpdateChargeType()

  const form = useForm<ChargeTypeFormValues>({
    resolver: zodResolver(chargeTypeSchema),
    defaultValues: {
      code: '',
      name: '',
      category: 'DUES',
      recurrence: 'RECURRING',
      amount: undefined,
      dueDay: undefined,
      description: '',
      allowAdvancePayment: false,
      advanceAppliesToOneTime: false,
      isActive: true,
      sortOrder: 0,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        code: chargeType?.code ?? '',
        name: chargeType?.name ?? '',
        category: chargeType?.category ?? 'DUES',
        recurrence: chargeType?.recurrence ?? 'RECURRING',
        amount: chargeType ? Number(chargeType.amount) : undefined,
        dueDay: chargeType?.dueDay ?? undefined,
        description: chargeType?.description ?? '',
        allowAdvancePayment: chargeType?.allowAdvancePayment ?? false,
        advanceAppliesToOneTime: chargeType?.advanceAppliesToOneTime ?? false,
        isActive: chargeType?.isActive ?? true,
        sortOrder: chargeType?.sortOrder ?? 0,
      })
    }
  }, [open, chargeType, form])

  const handleSubmit = (values: ChargeTypeFormValues) => {
    const input = {
      code: values.code,
      name: values.name,
      category: values.category as FinanceCategory,
      recurrence: values.recurrence as ChargeRecurrence,
      amount: values.amount,
      dueDay: values.dueDay ?? undefined,
      description: values.description || undefined,
      allowAdvancePayment: values.allowAdvancePayment ?? false,
      advanceAppliesToOneTime: values.advanceAppliesToOneTime ?? false,
      isActive: values.isActive ?? true,
      sortOrder: values.sortOrder ?? 0,
    }

    if (isEdit && chargeType) {
      update.mutate({ id: chargeType.id, input }, { onSuccess: () => onOpenChange(false) })
    } else {
      create.mutate(input, { onSuccess: () => onOpenChange(false) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit charge type' : 'New charge type'}</DialogTitle>
          <DialogDescription>
            Define a recurring or one-time charge that drives assessments and billing periods.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. MONTHLY_DUES" {...field} />
                    </FormControl>
                    <FormDescription>Unique, uppercase-friendly key used in imports.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Monthly dues" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FINANCE_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {toTitleCase(category)}
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
                name="recurrence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recurrence</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select recurrence" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CHARGE_RECURRENCES.map((recurrence) => (
                          <SelectItem key={recurrence} value={recurrence}>
                            {toTitleCase(recurrence)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={field.value ?? ''}
                        onChange={(event) => field.onChange(event.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormDescription>In PHP. Used as the default for assessments.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due day</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        placeholder="e.g. 28"
                        value={field.value ?? ''}
                        onChange={(event) =>
                          field.onChange(event.target.valueAsNumber || null)
                        }
                      />
                    </FormControl>
                    <FormDescription>Day of the month dues are due.</FormDescription>
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
                    <Input placeholder="What does this charge cover?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-3 rounded-lg border p-4">
              <FormField
                control={form.control}
                name="allowAdvancePayment"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4 space-y-0">
                    <div>
                      <FormLabel>Allow advance payment</FormLabel>
                      <FormDescription>Residents can pay future billing periods in advance.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              {form.watch('allowAdvancePayment') ? (
                <FormField
                  control={form.control}
                  name="advanceAppliesToOneTime"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between gap-4 space-y-0">
                      <div>
                        <FormLabel>Advance applies to one-time charges</FormLabel>
                        <FormDescription>Allow advance payment even for one-time charges.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              ) : null}
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4 space-y-0">
                    <div>
                      <FormLabel>Active</FormLabel>
                      <FormDescription>Inactive charge types cannot be selected for new billing.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending || update.isPending}>
                {isEdit ? 'Save changes' : 'Create charge type'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
