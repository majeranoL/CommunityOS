import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateTimePicker } from '@/components/shared/date-time-picker'
import { ResidentSelect } from '@/features/facilities/components/resident-select'
import { useCreatePayment, useUpdatePayment, useAssessments, useFinanceResidentOptions } from '@/features/finance/hooks/use-finance'
import { paymentSchema, PAYMENT_METHODS, type PaymentFormValues } from '@/features/finance/validation/finance'
import { useHasPermission } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import type { Payment, PaymentMethod } from '@/features/finance/types/finance'

interface PaymentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment?: Payment | null
  preselectAssessmentId?: string | null
}

export function PaymentFormDialog({ open, onOpenChange, payment, preselectAssessmentId }: PaymentFormDialogProps) {
  const isEdit = Boolean(payment)
  const createPayment = useCreatePayment()
  const updatePayment = useUpdatePayment()
  const canManage = useHasPermission(PERMISSIONS.paymentConfirm)

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentNumber: '',
      assessmentId: '',
      residentId: '',
      amount: 0,
      paymentDate: '',
      method: 'CASH',
      referenceNumber: '',
      remarks: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        paymentNumber: payment?.paymentNumber ?? '',
        assessmentId: payment?.assessment?.id ?? preselectAssessmentId ?? '',
        residentId: payment?.resident?.id ?? '',
        amount: payment ? Number(payment.amount) : 0,
        paymentDate: payment?.paymentDate ? new Date(payment.paymentDate).toISOString().slice(0, 16) : '',
        method: payment?.method ?? 'CASH',
        referenceNumber: payment?.referenceNumber ?? '',
        remarks: payment?.remarks ?? '',
      })
    }
  }, [open, payment, preselectAssessmentId, form])

  const handleSubmit = (values: PaymentFormValues) => {
    const input = {
      paymentNumber: values.paymentNumber,
      assessmentId: values.assessmentId,
      residentId: values.residentId,
      amount: values.amount,
      paymentDate: new Date(values.paymentDate).toISOString(),
      method: values.method as PaymentMethod,
      referenceNumber: values.referenceNumber || undefined,
      remarks: values.remarks || undefined,
    }

    if (isEdit && payment) {
      updatePayment.mutate(
        { id: payment.id, input },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      createPayment.mutate(input, { onSuccess: () => onOpenChange(false) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit payment' : 'Record payment'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the payment details.' : 'Record a payment against an assessment.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="paymentNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. PAY-0001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Method</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PAYMENT_METHODS.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method.replace(/_/g, ' ')}
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
              name="assessmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assessment</FormLabel>
                  <FormControl>
                    <AssessmentSelect value={field.value} onChange={field.onChange} />
                  </FormControl>
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
                    <ResidentSelect value={field.value} onChange={field.onChange} useOptions={useFinanceResidentOptions} />
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
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment date</FormLabel>
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
              name="referenceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. GCash receipt no. (optional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            {!isEdit && canManage ? (
              <FormDescription>
                Payments are recorded as pending and can be confirmed on the Payments tab.
              </FormDescription>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPayment.isPending || updatePayment.isPending}>
                {isEdit ? 'Save changes' : 'Record payment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function AssessmentSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useAssessments({ page: 1, limit: 50, search: search || undefined })

  return (
    <div className="space-y-2">
      <Input
        placeholder="Search assessments…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <Select value={value} onValueChange={onChange}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder={isLoading ? 'Loading…' : 'Select an assessment'} />
          </SelectTrigger>
        </FormControl>
        <SelectContent className="max-h-64">
          {data?.items.map((assessment) => (
            <SelectItem key={assessment.id} value={assessment.id}>
              {assessment.assessmentNumber} · {assessment.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
