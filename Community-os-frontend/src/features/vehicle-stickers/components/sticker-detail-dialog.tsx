import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useVerifySticker, useVehicleSticker } from '@/features/vehicle-stickers/hooks/use-vehicle-stickers'
import { useHasPermission } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import type { StickerRequestStatus } from '@/features/vehicle-stickers/types/vehicle-sticker'
import { formatDate, formatCurrency } from '@/lib/format'
import type { ReactNode } from 'react'

interface StickerDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stickerId: string | null
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  )
}

const STATUS_VARIANT: Record<StickerRequestStatus, 'warning' | 'success' | 'destructive' | 'muted'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
  CANCELLED: 'muted',
}

export function StickerDetailDialog({ open, onOpenChange, stickerId }: StickerDetailDialogProps) {
  const canVerify = useHasPermission(PERMISSIONS.stickerVerify)
  const { data: request, isLoading } = useVehicleSticker(open ? stickerId : null)
  const verifySticker = useVerifySticker(() => onOpenChange(false))

  const fee = Number(request?.feeTotal ?? 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sticker request</DialogTitle>
          <DialogDescription>
            {request?.status === 'PENDING'
              ? 'Review the details below before approving or rejecting.'
              : 'Sticker request details.'}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !request ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-2.5 rounded-md border bg-muted/40 p-4">
            <Row label="Request number">
              <span className="font-mono">{request.requestNumber}</span>
            </Row>
            <Row label="Vehicle">
              <span className="font-mono uppercase">{request.vehicle.plateNumber}</span>
            </Row>
            <Row label="Status">
              <Badge variant={STATUS_VARIANT[request.status]}>{request.status}</Badge>
            </Row>
            <Row label="Quantity">{request.quantity}</Row>
            {request.requestedStickerNumber ? (
              <Row label="Preferred number">
                <span className="font-mono">{request.requestedStickerNumber}</span>
              </Row>
            ) : null}
            <Row label="Fee">
              {fee > 0 ? formatCurrency(fee) : 'Free'}
            </Row>
            {request.assessment ? (
              <Row label="Billed as">
                <span className="text-right">
                  {formatCurrency(request.assessment.amount)}
                  <span className="block font-mono text-xs text-muted-foreground">
                    {request.assessment.assessmentNumber}
                  </span>
                </span>
              </Row>
            ) : null}
            {request.stickers.length > 0 ? (
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Sticker(s)</span>
                <span className="text-right font-mono text-xs">
                  {request.stickers.map((sticker) => sticker.stickerNumber).join(', ')}
                </span>
              </div>
            ) : null}
            <Row label="Requested by">
              {request.requestedBy.firstName} {request.requestedBy.lastName}
            </Row>
            {request.approvedBy ? (
              <Row label="Reviewed by">
                {request.approvedBy.firstName} {request.approvedBy.lastName}
              </Row>
            ) : null}
            {request.reviewRemarks ? <Row label="Remarks">{request.reviewRemarks}</Row> : null}
            <Row label="Requested at">{formatDate(request.createdAt)}</Row>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {canVerify && request?.status === 'PENDING' ? (
            <div className="flex w-full gap-2">
              <Button
                type="button"
                variant="destructive"
                className="flex-1"
                disabled={verifySticker.isPending}
                onClick={() =>
                  verifySticker.mutate({ id: request.id, input: { approved: false } })
                }
              >
                {verifySticker.isPending ? 'Saving…' : 'Reject'}
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={verifySticker.isPending}
                onClick={() =>
                  verifySticker.mutate({ id: request.id, input: { approved: true } })
                }
              >
                {verifySticker.isPending ? 'Saving…' : 'Approve'}
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}