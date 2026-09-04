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
import type { StickerStatus } from '@/features/vehicle-stickers/types/vehicle-sticker'
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

const STATUS_VARIANT: Record<StickerStatus, 'warning' | 'success' | 'muted' | 'destructive'> = {
  PENDING: 'warning',
  ACTIVE: 'success',
  EXPIRED: 'muted',
  REVOKED: 'destructive',
}

export function StickerDetailDialog({ open, onOpenChange, stickerId }: StickerDetailDialogProps) {
  const canVerify = useHasPermission(PERMISSIONS.stickerVerify)
  const { data: sticker, isLoading } = useVehicleSticker(open ? stickerId : null)
  const verifySticker = useVerifySticker(() => onOpenChange(false))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sticker request</DialogTitle>
          <DialogDescription>
            {sticker?.status === 'PENDING'
              ? 'Review the details below before approving or rejecting.'
              : 'Vehicle sticker details.'}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !sticker ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-2.5 rounded-md border bg-muted/40 p-4">
            <Row label="Vehicle">
              <span className="font-mono uppercase">{sticker.vehicle.plateNumber}</span>
            </Row>
            <Row label="Status">
              <Badge variant={STATUS_VARIANT[sticker.status]}>{sticker.status}</Badge>
            </Row>
            <Row label="Sticker number">
              <span className="font-mono">{sticker.stickerNumber ?? '—'}</span>
            </Row>
            <Row label="Issue date">{formatDate(sticker.issueDate)}</Row>
            <Row label="Expires">{sticker.status === 'ACTIVE' && formatDate(sticker.expirationDate)}</Row>
            {sticker.assessment ? (
              <Row label="Fee billed">
                {formatCurrency(sticker.assessment.amount)}{' '}
                <span className="text-xs text-muted-foreground">
                  ({sticker.assessment.assessmentNumber})
                </span>
              </Row>
            ) : null}
            {sticker.verificationRemarks ? (
              <Row label="Remarks">{sticker.verificationRemarks}</Row>
            ) : null}
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {canVerify && sticker?.status === 'PENDING' ? (
            <div className="flex w-full gap-2">
              <Button
                type="button"
                variant="destructive"
                className="flex-1"
                disabled={verifySticker.isPending}
                onClick={() =>
                  verifySticker.mutate({ id: sticker.id, input: { approved: false } })
                }
              >
                {verifySticker.isPending ? 'Saving…' : 'Reject'}
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={verifySticker.isPending}
                onClick={() =>
                  verifySticker.mutate({ id: sticker.id, input: { approved: true } })
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