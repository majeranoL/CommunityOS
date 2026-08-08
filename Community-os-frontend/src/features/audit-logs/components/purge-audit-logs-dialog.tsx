import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePurgeAuditLogs } from '@/features/audit-logs/hooks/use-audit-logs'

interface PurgeAuditLogsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PurgeAuditLogsDialog({ open, onOpenChange }: PurgeAuditLogsDialogProps) {
  const [keepDays, setKeepDays] = useState('90')

  const purge = usePurgeAuditLogs(() => onOpenChange(false))

  const handlePurge = () => {
    const days = Number(keepDays)
    if (!Number.isFinite(days) || days < 1) return
    purge.mutate(days)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Purge audit logs</DialogTitle>
          <DialogDescription>
            Permanently delete audit entries older than the number of days below. This cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label htmlFor="keepDays" className="text-sm font-medium">
            Keep last
          </label>
          <Input
            id="keepDays"
            type="number"
            min={1}
            value={keepDays}
            onChange={(event) => setKeepDays(event.target.value)}
            placeholder="90"
          />
          <p className="text-xs text-muted-foreground">
            Entries older than this many days will be deleted.
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={purge.isPending}
            onClick={handlePurge}
          >
            {purge.isPending ? 'Purging…' : 'Purge logs'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
