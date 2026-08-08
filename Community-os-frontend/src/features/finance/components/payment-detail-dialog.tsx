import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { usePayment } from '@/features/finance/hooks/use-finance'
import { formatCurrency, formatDate } from '@/lib/format'
import { toTitleCase } from '@/lib/format'

interface PaymentDetailDialogProps {
  paymentId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PaymentDetailDialog({ paymentId, open, onOpenChange }: PaymentDetailDialogProps) {
  const { data: payment, isLoading } = usePayment(paymentId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{payment?.paymentNumber ?? 'Payment'}</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            {payment ? <StatusBadge status={payment.status} /> : null}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-48" />
          </div>
        ) : payment ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="mt-1 text-sm font-semibold">{formatCurrency(payment.amount)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="mt-1 text-sm font-medium">{formatDate(payment.paymentDate)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Method</p>
              <p className="mt-1 text-sm font-medium">{toTitleCase(payment.method)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Resident</p>
              <p className="mt-1 text-sm font-medium">
                {payment.resident ? `${payment.resident.firstName} ${payment.resident.lastName}` : '—'}
              </p>
            </div>
            <div className="rounded-lg border p-4 sm:col-span-2">
              <p className="text-xs text-muted-foreground">Assessment</p>
              <p className="mt-1 text-sm font-medium">
                {payment.assessment ? `${payment.assessment.assessmentNumber} · ${payment.assessment.title}` : '—'}
              </p>
            </div>
            {payment.referenceNumber || payment.remarks ? (
              <div className="space-y-1 rounded-lg border bg-muted/40 p-4 text-sm sm:col-span-2">
                {payment.referenceNumber ? (
                  <p>
                    <span className="text-muted-foreground">Reference: </span>
                    {payment.referenceNumber}
                  </p>
                ) : null}
                {payment.remarks ? (
                  <p>
                    <span className="text-muted-foreground">Remarks: </span>
                    {payment.remarks}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
