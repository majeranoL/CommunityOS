import { AlertTriangle, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/shared/status-badge'
import { SecureImage } from '@/components/shared/secure-image'
import { usePaymentReceipt } from '@/features/finance/hooks/use-finance'
import { householdLabel } from '@/features/finance/components/household-select'
import { formatCurrency, formatDate, formatDateTime, toTitleCase } from '@/lib/format'

interface PaymentReceiptDialogProps {
  paymentId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PaymentReceiptDialog({ paymentId, open, onOpenChange }: PaymentReceiptDialogProps) {
  const { data, isLoading } = usePaymentReceipt(paymentId)
  const payment = data?.payment ?? null
  const community = data?.community ?? null
  const resident = payment?.resident ?? null

  const payor = resident
    ? [resident.firstName, resident.middleName, resident.lastName, resident.suffix]
        .filter(Boolean)
        .join(' ')
    : '—'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto print:inset-auto print:max-h-none print:max-w-none print:translate-x-0 print:translate-y-0 print:overflow-visible print:border-0 print:shadow-none print:p-0 sm:max-w-2xl">
        <DialogHeader className="print:hidden">
          <DialogTitle>Official receipt</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            {payment ? <StatusBadge status={payment.status} /> : null}
          </DialogDescription>
          <Button
            variant="outline"
            size="sm"
            type="button"
            className="sm:ml-auto"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-4 w-64" />
          </div>
        ) : payment ? (
          <div className="space-y-6">
            {payment.status === 'PENDING_VERIFICATION' ? (
              <Alert variant="warning" className="print:hidden">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Awaiting official approval</AlertTitle>
                <AlertDescription>
                  This receipt was generated automatically from your payment
                  submission. It becomes an official receipt once a finance officer
                  or the president verifies your payment.
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="flex items-start justify-between gap-4 border-b pb-4">
              <div className="flex items-start gap-3">
                {community?.logoUrl ? (
                  <SecureImage
                    src={community.logoUrl}
                    alt={community.displayName}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : null}
                <div>
                  <h2 className="text-lg font-bold">{community?.displayName ?? 'Community'}</h2>
                  {community?.address ? (
                    <p className="text-xs text-muted-foreground">{community.address}</p>
                  ) : null}
                  {community?.contactNumber || community?.email ? (
                    <p className="text-xs text-muted-foreground">
                      {[community.contactNumber, community.email].filter(Boolean).join(' · ')}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="text-right">
                <h3 className="font-mono text-lg font-bold tracking-tight">OFFICIAL RECEIPT</h3>
                <p className="mt-1 text-sm font-semibold">No. {payment.paymentNumber}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(payment.createdAt)}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Paid by
                </p>
                <p className="mt-1 text-sm font-semibold">{payor}</p>
                {resident?.household ? (
                  <p className="text-xs text-muted-foreground">
                    {householdLabel(resident.household)}
                  </p>
                ) : null}
              </div>
              <div className="sm:text-right">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Amount paid
                </p>
                <p className="mt-1 text-lg font-bold">{formatCurrency(payment.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  {toTitleCase(payment.method)}
                  {payment.referenceNumber ? ` · Ref ${payment.referenceNumber}` : ''}
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
              ) : payment.chargeType ? (
                <p className="rounded-xl border p-4 text-sm text-muted-foreground">
                  {payment.chargeType.name}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No allocations recorded.</p>
              )}
            </div>

            {payment.remarks ? (
              <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                <p>
                  <span className="text-muted-foreground">Remarks: </span>
                  {payment.remarks}
                </p>
              </div>
            ) : null}

            <div className="flex justify-between gap-8 border-t pt-6 text-xs text-muted-foreground">
              <div className="flex-1">
                <p>Prepared by</p>
                <div className="mt-8 border-t border-dashed pt-1">Finance office</div>
              </div>
              <div className="flex-1">
                <p>Payment date</p>
                <div className="mt-8 border-t border-dashed pt-1">{formatDate(payment.paymentDate)}</div>
              </div>
              <div className="flex-1">
                <p>Received by</p>
                <div className="mt-8 border-t border-dashed pt-1">
                  {payment.verifiedBy
                    ? `${payment.verifiedBy.firstName} ${payment.verifiedBy.lastName}`
                    : 'Pending officer verification'}
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Thank you for your payment. This receipt was generated automatically.
            </p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
