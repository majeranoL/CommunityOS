import { useState } from 'react'
import { CheckCircle2, Pencil, PlayCircle, Trash2, UserRoundCheck, Wrench, XCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/shared/status-badge'
import { StaffSelect } from '@/features/maintenance/components/staff-select'
import { useHasPermission } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import {
  useAssignMaintenance,
  useCancelMaintenance,
  useDeleteMaintenance,
  useResolveMaintenance,
  useStartMaintenance,
} from '@/features/maintenance/hooks/use-maintenance'
import type { MaintenanceListItem } from '@/features/maintenance/types/maintenance'
import { formatCurrency, formatDate, toTitleCase } from '@/lib/format'

interface MaintenanceDetailsDialogProps {
  maintenance: MaintenanceListItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: () => void
}

export function MaintenanceDetailsDialog({
  maintenance,
  open,
  onOpenChange,
  onEdit,
}: MaintenanceDetailsDialogProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [staffId, setStaffId] = useState('')

  const canUpdate = useHasPermission(PERMISSIONS.maintenanceUpdate)
  const canDelete = useHasPermission(PERMISSIONS.maintenanceDelete)
  const canAssign = useHasPermission(PERMISSIONS.maintenanceAssign)
  const canStart = useHasPermission(PERMISSIONS.maintenanceStart)
  const canResolve = useHasPermission(PERMISSIONS.maintenanceResolve)
  const canCancel = useHasPermission(PERMISSIONS.maintenanceCancel)

  const assignMaintenance = useAssignMaintenance()
  const startMaintenance = useStartMaintenance()
  const resolveMaintenance = useResolveMaintenance()
  const cancelMaintenance = useCancelMaintenance()
  const deleteMaintenance = useDeleteMaintenance(() => {
    setConfirmOpen(false)
    onOpenChange(false)
  })

  const staffName = maintenance.assignedTo
    ? `${maintenance.assignedTo.firstName} ${maintenance.assignedTo.lastName}`
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Maintenance details</DialogTitle>
          <DialogDescription>{maintenance.maintenanceNumber}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 shrink-0 text-muted-foreground" />
              <h3 className="flex-1 font-semibold">{maintenance.title}</h3>
              <StatusBadge status={maintenance.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {toTitleCase(maintenance.category)} · {toTitleCase(maintenance.priority)} priority
            </p>
          </div>

          {maintenance.description ? (
            <p className="text-sm text-muted-foreground">{maintenance.description}</p>
          ) : null}

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Facility</dt>
              <dd>{maintenance.facility?.name || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Assigned to</dt>
              <dd>{staffName || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Cost</dt>
              <dd>{formatCurrency(maintenance.cost)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Scheduled</dt>
              <dd>{maintenance.scheduledAt ? formatDate(maintenance.scheduledAt) : '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd>{formatDate(maintenance.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Completed</dt>
              <dd>{maintenance.completedAt ? formatDate(maintenance.completedAt) : '—'}</dd>
            </div>
            {maintenance.remarks ? (
              <div className="col-span-2">
                <dt className="text-muted-foreground">Remarks</dt>
                <dd>{maintenance.remarks}</dd>
              </div>
            ) : null}
          </dl>

          {assignOpen ? (
            <div className="space-y-2 rounded-lg border p-3">
              <Label>Assign to staff</Label>
              <StaffSelect value={staffId} onChange={setStaffId} />
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAssignOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!staffId || assignMaintenance.isPending}
                  onClick={() => {
                    if (!staffId) return
                    assignMaintenance.mutate({ id: maintenance.id, staffId })
                    setAssignOpen(false)
                    setStaffId('')
                  }}
                >
                  Assign
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            {canAssign && maintenance.status !== 'RESOLVED' && maintenance.status !== 'CANCELLED' ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setAssignOpen(true)}>
                <UserRoundCheck className="h-4 w-4" />
                Assign
              </Button>
            ) : null}
            {canStart && (maintenance.status === 'OPEN' || maintenance.status === 'ASSIGNED') ? (
              <Button type="button" variant="outline" size="sm" onClick={() => startMaintenance.mutate(maintenance.id)}>
                <PlayCircle className="h-4 w-4" />
                Start
              </Button>
            ) : null}
            {canResolve && (maintenance.status === 'IN_PROGRESS' || maintenance.status === 'ASSIGNED') ? (
              <Button type="button" variant="outline" size="sm" onClick={() => resolveMaintenance.mutate(maintenance.id)}>
                <CheckCircle2 className="h-4 w-4" />
                Resolve
              </Button>
            ) : null}
            {canCancel && maintenance.status !== 'RESOLVED' && maintenance.status !== 'CANCELLED' ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  if (window.confirm(`Cancel request ${maintenance.maintenanceNumber}?`)) {
                    cancelMaintenance.mutate(maintenance.id)
                  }
                }}
              >
                <XCircle className="h-4 w-4" />
                Cancel
              </Button>
            ) : null}
            <div className="ml-auto flex items-center gap-2">
              {canUpdate ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    onOpenChange(false)
                    onEdit()
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              ) : null}
              {canDelete ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>

          {confirmOpen ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <p className="font-medium">Delete {maintenance.maintenanceNumber}?</p>
              <p className="mt-1 text-muted-foreground">
                This removes the request from the list. This cannot be undone.
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteMaintenance.mutate(maintenance.id)}
                  disabled={deleteMaintenance.isPending}
                >
                  Delete
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
