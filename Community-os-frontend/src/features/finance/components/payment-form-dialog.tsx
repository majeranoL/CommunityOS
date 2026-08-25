import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateTimePicker } from '@/components/shared/date-time-picker'
import { ResidentSelect } from '@/features/facilities/components/resident-select'
import { documentsService } from '@/features/documents/services/documents'
import {
  useCreatePayment,
  useUpdatePayment,
  useAssessments,
  useBillingPeriods,
  useChargeTypes,
  useFinanceResidentOptions,
} from '@/features/finance/hooks/use-finance'
import { paymentSchema, PAYMENT_METHODS, type PaymentFormValues } from '@/features/finance/validation/finance'
import type { Payment, PaymentMethod } from '@/features/finance/types/finance'
import { formatCurrency } from '@/lib/format'

interface PaymentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment?: Payment | null
  preselectAssessmentId?: string | null
}

interface PayableItem {
  key: string
  kind: 'assessment' | 'billing-period'
  id: string
  label: string
  amount: number
}

const PAYABLE_STATUSES = new Set(['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'])

export function PaymentFormDialog({ open, onOpenChange, payment, preselectAssessmentId }: PaymentFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <PaymentFormDialogContent
          payment={payment}
          preselectAssessmentId={preselectAssessmentId}
          onOpenChange={onOpenChange}
        />
      ) : null}
    </Dialog>
  )
}

function PaymentFormDialogContent({
  onOpenChange,
  payment,
  preselectAssessmentId,
}: {
  onOpenChange: (open: boolean) => void
  payment?: Payment | null
  preselectAssessmentId?: string | null
}) {
  const isEdit = Boolean(payment)
  const createPayment = useCreatePayment()
  const updatePayment = useUpdatePayment()

  const initialHouseholdId = payment?.resident?.householdId ?? null
  const [householdId, setHouseholdId] = useState<string | null>(initialHouseholdId)
  const [selected, setSelected] = useState<Set<string>>(() => {
    const ids = new Set<string>()
    payment?.allocations?.forEach((allocation) => {
      if (!allocation.reversedAt) ids.add(allocation.assessmentId)
    })
    if (preselectAssessmentId) ids.add(preselectAssessmentId)
    return ids
  })
  const [uploading, setUploading] = useState(false)
  const [proof, setProof] = useState<{ fileId: string; url: string; name: string } | null>(
    payment?.proofFileId && payment.proofUrl
      ? { fileId: payment.proofFileId, url: payment.proofUrl, name: 'Payment proof' }
      : null,
  )

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentNumber: payment?.paymentNumber ?? '',
      residentId: payment?.resident?.id ?? '',
      amount: payment ? Number(payment.amount) : 0,
      paymentDate: payment?.paymentDate ? new Date(payment.paymentDate).toISOString().slice(0, 16) : '',
      method: payment?.method ?? 'CASH',
      referenceNumber: payment?.referenceNumber ?? '',
      remarks: payment?.remarks ?? '',
      chargeTypeId: payment?.chargeType?.id ?? '',
      assessmentId: '',
      billingPeriodIds: payment?.allocations
        ?.filter((allocation) => !allocation.reversedAt)
        .map((allocation) => allocation.assessmentId) ?? [],
      allocations: payment?.allocations
        ?.filter((allocation) => !allocation.reversedAt)
        .map((allocation) => ({ assessmentId: allocation.assessmentId, amount: Number(allocation.allocatedAmount) })) ?? [],
      proofFileId: payment?.proofFileId ?? '',
      proofUrl: payment?.proofUrl ?? '',
    },
  })

  // Eligible items for the resident's household
  const { data: assessmentData } = useAssessments({
    page: 1,
    limit: 100,
    ...(householdId ? { householdId } : {}),
  })

  const { data: periodData } = useBillingPeriods({ page: 1, limit: 100 })
  const { data: chargeTypeData } = useChargeTypes({ page: 1, limit: 100 })

  const advanceChargeTypes = useMemo(
    () =>
      new Set(
        (chargeTypeData?.items ?? [])
          .filter((item) => item.isActive && item.allowAdvancePayment)
          .map((item) => item.id),
      ),
    [chargeTypeData],
  )

  const items: PayableItem[] = useMemo(() => {
    const assessmentItems: PayableItem[] = (assessmentData?.items ?? [])
      .filter((assessment) => PAYABLE_STATUSES.has(assessment.status))
      .map((assessment) => ({
        key: `assessment:${assessment.id}`,
        kind: 'assessment' as const,
        id: assessment.id,
        label: `${assessment.assessmentNumber} · ${assessment.title}`,
        amount: Math.max(Number(assessment.amount) - Number(assessment.paidAmount ?? 0), 0),
      }))
      .filter((item) => item.amount > 0)

    const periodItems: PayableItem[] = (periodData?.items ?? [])
      .filter((period) => period.status === 'OPEN' && advanceChargeTypes.has(period.chargeType.id))
      .map((period) => ({
        key: `period:${period.id}`,
        kind: 'billing-period' as const,
        id: period.id,
        label: `${period.label} (advance)`,
        amount: Number(period.amount),
      }))

    return [...assessmentItems, ...periodItems]
  }, [assessmentData, periodData, advanceChargeTypes])

  const selectedItems = items.filter((item) => selected.has(item.key))
  const totalAmount = selectedItems.reduce((sum, item) => sum + item.amount, 0)

  useEffect(() => {
    if (!isEdit) {
      form.setValue('amount', totalAmount, { shouldValidate: true })
    }
  }, [totalAmount, form, isEdit])

  const toggleItem = (key: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleProofUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''
    setUploading(true)
    try {
      const result = await documentsService.upload(file)
      const next = { fileId: result.id, url: result.url, name: result.originalName }
      setProof(next)
      form.setValue('proofFileId', next.fileId, { shouldValidate: true })
      form.setValue('proofUrl', next.url, { shouldValidate: true })
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = (values: PaymentFormValues) => {
    const assessments = selectedItems
      .filter((item) => item.kind === 'assessment')
      .map((item) => ({ assessmentId: item.id, amount: item.amount }))
    const billingPeriodIds = selectedItems
      .filter((item) => item.kind === 'billing-period')
      .map((item) => item.id)

    const input = {
      paymentNumber: values.paymentNumber,
      residentId: values.residentId,
      amount: values.amount,
      paymentDate: new Date(values.paymentDate).toISOString(),
      method: values.method as PaymentMethod,
      referenceNumber: values.referenceNumber || undefined,
      remarks: values.remarks || undefined,
      allocations: assessments.length > 0 ? assessments : undefined,
      billingPeriodIds: billingPeriodIds.length > 0 ? billingPeriodIds : undefined,
      proofFileId: values.proofFileId || undefined,
      proofUrl: values.proofUrl || undefined,
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
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit payment' : 'Record payment'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update payment metadata. Items can only be changed while pending verification.'
              : 'Select the assessments or billing periods this payment covers.'}
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
              name="residentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resident</FormLabel>
                  <FormControl>
                    <ResidentSelect
                      value={field.value}
                      onChange={field.onChange}
                      useOptions={useFinanceResidentOptions}
                      onSelect={(resident) => setHouseholdId(resident.householdId)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEdit && householdId ? (
              <div className="space-y-2 rounded-lg border p-3">
                <p className="text-sm font-medium">What is this payment for?</p>
                <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <label
                      key={item.key}
                      className="flex cursor-pointer items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
                    >
                      <span className="flex items-center gap-2">
                        <Checkbox
                          checked={selected.has(item.key)}
                          onCheckedChange={() => toggleItem(item.key)}
                        />
                        <span>{item.label}</span>
                      </span>
                      <span className="font-medium">{formatCurrency(item.amount)}</span>
                    </label>
                  ))}
                  {items.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-muted-foreground">
                      No outstanding assessments or advance billing periods found for this household.
                    </p>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total selected: <span className="font-semibold text-foreground">{formatCurrency(totalAmount)}</span>
                </p>
              </div>
            ) : null}

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
                    <FormDescription>
                      In PHP. Must equal the total of selected items ({formatCurrency(totalAmount)}).
                    </FormDescription>
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

            <div className="space-y-2">
              <FormLabel>Proof of payment</FormLabel>
              {proof ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                  <span className="truncate text-muted-foreground">
                    <Upload className="mr-1 inline h-4 w-4" />
                    {proof.name}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      setProof(null)
                      form.setValue('proofFileId', '', { shouldValidate: true })
                      form.setValue('proofUrl', '', { shouldValidate: true })
                    }}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove proof</span>
                  </Button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground hover:bg-accent">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? 'Uploading…' : 'Upload receipt or screenshot'}
                  <input type="file" accept="image/*,.pdf" className="sr-only" onChange={handleProofUpload} disabled={uploading} />
                </label>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPayment.isPending || updatePayment.isPending || uploading}>
                {isEdit ? 'Save changes' : 'Record payment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
  )
}
