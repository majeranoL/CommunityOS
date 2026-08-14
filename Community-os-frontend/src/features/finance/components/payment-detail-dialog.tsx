import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/shared/status-badge'
import { usePayment } from '@/features/finance/hooks/use-finance'
import { documentsService } from '@/features/documents/services/documents'
import { formatCurrency, formatDate, formatDateTime, toTitleCase } from '@/lib/format'

interface PaymentDetailDialogProps {
  paymentId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ProofLink({ url }: { url: string | null }) {
  if (!url) return null
  return (
    <Button
      type="button"
      variant="link"
      className="h-auto p-0"
      onClick={() => documentsService.openFile({ fileUrl: url })}
    >
      View proof
    </Button>
  )
}

export function PaymentDetailDialog({ paymentId, open, onOpenChange }: PaymentDetailDialogProps) {
  const { data: payment, isLoading } = usePayment(paymentId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
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
          <div className="space-y-4">
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
            </div>

            <div>
              <h4 className="mb-2 text-sm font-medium">Applied to</h4>
              {payment.allocations.length > 0 ? (
                <div className="rounded-xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Assessment</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payment.allocations.map((allocation) => (
                        <TableRow key={allocation.id}>
                          <TableCell>
                            <span className="font-medium">
                              {allocation.assessment.assessmentNumber}
                            </span>
                            <span className="ml-2 text-muted-foreground">
                              {allocation.assessment.title}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(allocation.allocatedAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No allocations recorded.</p>
              )}
            </div>

            {payment.chargeType ? (
              <div className="rounded-lg border p-4 text-sm">
                <p>
                  <span className="text-muted-foreground">Charge type: </span>
                  {payment.chargeType.name}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {toTitleCase(payment.chargeType.category)}
                  </span>
                </p>
              </div>
            ) : null}

            {payment.referenceNumber || payment.remarks || payment.proofUrl ? (
              <div className="space-y-1 rounded-lg border bg-muted/40 p-4 text-sm">
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
                {payment.proofUrl ? (
                  <p>
                    <span className="text-muted-foreground">Proof: </span>
                    <ProofLink url={payment.proofUrl} />
                  </p>
                ) : null}
              </div>
            ) : null}

            {payment.status === 'REJECTED' && payment.rejectionReason ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
                <p className="font-medium text-destructive">Rejection reason</p>
                <p className="mt-1">{payment.rejectionReason}</p>
              </div>
            ) : null}

            {(payment.verifiedAt || payment.rejectedAt || payment.refundedAt || payment.cancelledAt) ? (
              <div className="space-y-1 rounded-lg border p-4 text-xs text-muted-foreground">
                {payment.verifiedAt ? (
                  <p>
                    Verified {formatDateTime(payment.verifiedAt)}
                    {payment.verifiedBy ? ` by ${payment.verifiedBy.firstName} ${payment.verifiedBy.lastName}` : ''}
                  </p>
                ) : null}
                {payment.rejectedAt ? (
                  <p>
                    Rejected {formatDateTime(payment.rejectedAt)}
                    {payment.rejectedBy ? ` by ${payment.rejectedBy.firstName} ${payment.rejectedBy.lastName}` : ''}
                  </p>
                ) : null}
                {payment.refundedAt ? (
                  <p>
                    Refunded {formatDateTime(payment.refundedAt)}
                    {payment.refundedBy ? ` by ${payment.refundedBy.firstName} ${payment.refundedBy.lastName}` : ''}
                  </p>
                ) : null}
                {payment.cancelledAt ? (
                  <p>
                    Cancelled {formatDateTime(payment.cancelledAt)}
                    {payment.cancelledBy ? ` by ${payment.cancelledBy.firstName} ${payment.cancelledBy.lastName}` : ''}
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
