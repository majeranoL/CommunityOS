import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateTimePicker } from '@/components/shared/date-time-picker'
import { FileUpload } from '@/components/shared/file-upload'
import { useCreateUtilityExpense, useUpdateUtilityExpense } from '@/features/finance/hooks/use-finance'
import { utilityExpenseSchema, PAYMENT_METHODS, UTILITY_TYPES, type UtilityExpenseFormValues } from '@/features/finance/validation/finance'
import { toTitleCase } from '@/lib/format'
import type { UtilityExpense } from '@/features/finance/types/finance'

interface UtilityExpenseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense?: UtilityExpense | null
}

export function UtilityExpenseFormDialog({ open, onOpenChange, expense }: UtilityExpenseFormDialogProps) {
  const isEdit = Boolean(expense)
  const createExpense = useCreateUtilityExpense()
  const updateExpense = useUpdateUtilityExpense()

  const form = useForm<UtilityExpenseFormValues>({
    resolver: zodResolver(utilityExpenseSchema),
    defaultValues: {
      providerName: '',
      utilityType: 'OTHER',
      amount: 0,
      expenseDate: '',
      billingPeriod: '',
      paymentMethod: 'CASH',
      referenceNumber: '',
      invoiceNumber: '',
      description: '',
      receiptFileId: '',
      receiptUrl: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        providerName: expense?.providerName ?? '',
        utilityType: expense?.utilityType ?? 'OTHER',
        amount: expense ? Number(expense.amount) : 0,
        expenseDate: expense?.expenseDate ? new Date(expense.expenseDate).toISOString().slice(0, 16) : '',
        billingPeriod: expense?.billingPeriod ?? '',
        paymentMethod: expense?.paymentMethod ?? 'CASH',
        referenceNumber: expense?.referenceNumber ?? '',
        invoiceNumber: expense?.invoiceNumber ?? '',
        description: expense?.description ?? '',
        receiptFileId: expense?.receiptFileId ?? '',
        receiptUrl: expense?.receiptFileId ? `/api/uploads/${expense.receiptFileId}` : '',
      })
    }
  }, [open, expense, form])

  const handleSubmit = (values: UtilityExpenseFormValues) => {
    const input = {
      providerName: values.providerName,
      utilityType: values.utilityType,
      amount: values.amount,
      expenseDate: new Date(values.expenseDate).toISOString(),
      billingPeriod: values.billingPeriod || undefined,
      paymentMethod: values.paymentMethod,
      referenceNumber: values.referenceNumber || undefined,
      invoiceNumber: values.invoiceNumber || undefined,
      description: values.description || undefined,
      receiptFileId: values.receiptFileId || undefined,
    }

    if (isEdit && expense) {
      updateExpense.mutate(
        { id: expense.id, input },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      createExpense.mutate(input, { onSuccess: () => onOpenChange(false) })
    }
  }

  const isSubmitting = createExpense.isPending || updateExpense.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Utility Expense' : 'Record Utility Expense'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the utility expense details.' : 'Track a payment to a utility provider.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="providerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Manila Water, Meralco" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="utilityType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Utility Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UTILITY_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {toTitleCase(type)}
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
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expenseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <DateTimePicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PAYMENT_METHODS.map((method) => (
                          <SelectItem key={method} value={method}>
                            {toTitleCase(method.replace(/_/g, ' '))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="billingPeriod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Billing Period</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Jun 2026" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="referenceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
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
                    <Textarea placeholder="Optional notes" rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="receiptUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Receipt / Proof of Payment</FormLabel>
                  <FormControl>
                    <FileUpload
                      value={field.value}
                      onChange={(url) => {
                        field.onChange(url)
                        if (!url) {
                          form.setValue('receiptFileId', '')
                        }
                      }}
                      onUploadComplete={(results) => {
                        if (results[0]) {
                          form.setValue('receiptFileId', results[0].id)
                          form.setValue('receiptUrl', results[0].url)
                        }
                      }}
                      maxFiles={1}
                      accept="image/*,application/pdf"
                      label="Upload utility bill / receipt"
                      description="PNG, JPG, or PDF up to 10MB"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : isEdit ? 'Update' : 'Record'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
