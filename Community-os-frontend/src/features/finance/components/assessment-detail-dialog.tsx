import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAssessment, useApplyAssessmentDiscount } from '@/features/finance/hooks/use-finance'
import { useHasPermission } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import { householdLabel } from '@/features/finance/components/household-select'
import { formatCurrency, formatDate } from '@/lib/format'

interface AssessmentDetailDialogProps {
  assessmentId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AssessmentDetailDialog({ assessmentId, open, onOpenChange }: AssessmentDetailDialogProps) {
  const { data: assessment, isLoading } = useAssessment(assessmentId)
  const canDiscount = useHasPermission(PERMISSIONS.financeManage)
  const discount = useApplyAssessmentDiscount()
  const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENTAGE'>('FIXED')
  const [discountValue, setDiscountValue] = useState('')
  const netAmount = assessment
    ? Math.max(Number(assessment.amount) - Number(assessment.discountAmount ?? 0), 0)
    : 0
  const percentInvalid = discountType === 'PERCENTAGE' && Number(discountValue) > 100

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{assessment?.title ?? 'Assessment'}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">{assessment?.assessmentNumber}</span>
            {assessment ? <StatusBadge status={assessment.status} /> : null}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : assessment ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Household</p>
                <p className="mt-1 text-sm font-medium">
                  {assessment.household ? householdLabel(assessment.household) : '—'}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Due date</p>
                <p className="mt-1 text-sm font-medium">{formatDate(assessment.dueDate)}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="mt-1 text-sm font-semibold">
                  {formatCurrency(netAmount)}
                  {Number(assessment.discountAmount ?? 0) > 0 ? (
                    <span className="ml-1 text-xs text-muted-foreground line-through">
                      {formatCurrency(assessment.amount)}
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="mt-1 text-sm font-medium">{formatCurrency(assessment.paidAmount)}</p>
              </div>
            </div>
            {canDiscount && Number(assessment.paidAmount) === 0 && assessment.status !== 'PAID' ? (
              <div className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
                <div className="flex-1">
                  <p className="mb-1 text-xs text-muted-foreground">Officer discount</p>
                  <Input type="number" min="0.01" max={discountType === 'PERCENTAGE' ? 100 : undefined} value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} placeholder="Amount or %" />
                </div>
                <Button variant="outline" onClick={() => discount.mutate({ id: assessment.id, input: { type: discountType, value: Number(discountValue) } })} disabled={discount.isPending || !Number(discountValue) || percentInvalid}>
                  Apply
                </Button>
                {percentInvalid ? <p className="w-full text-xs text-destructive">Percentage must be 100 or less.</p> : null}
                <Button variant="ghost" onClick={() => setDiscountType(discountType === 'FIXED' ? 'PERCENTAGE' : 'FIXED')}>
                  {discountType === 'FIXED' ? 'Fixed' : 'Percent'}
                </Button>
              </div>
            ) : null}

            {assessment.period || assessment.description || assessment.remarks ? (
              <div className="space-y-1 rounded-lg border bg-muted/40 p-4 text-sm">
                {assessment.period ? (
                  <p>
                    <span className="text-muted-foreground">Period: </span>
                    {assessment.period}
                  </p>
                ) : null}
                {assessment.description ? (
                  <p>
                    <span className="text-muted-foreground">Description: </span>
                    {assessment.description}
                  </p>
                ) : null}
                {assessment.remarks ? (
                  <p>
                    <span className="text-muted-foreground">Remarks: </span>
                    {assessment.remarks}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div>
              <h4 className="mb-2 text-sm font-medium">Payments</h4>
              {assessment.payments.length > 0 ? (
                <div className="rounded-xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Number</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assessment.payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">{payment.paymentNumber}</TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(payment.paymentDate)}</TableCell>
                          <TableCell>
                            <StatusBadge status={payment.status} />
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(payment.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  <Badge variant="secondary">No payments yet</Badge>
                  Payments appear here once residents settle this assessment.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
