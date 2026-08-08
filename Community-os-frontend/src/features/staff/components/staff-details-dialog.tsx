import { useState } from 'react'
import { BadgeCheck, BadgeX, Briefcase, Pencil, Trash2, Wrench } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/status-badge'
import { useHasPermission } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import { useDeleteStaff, useStaff, useUpdateStaff } from '@/features/staff/hooks/use-staff'
import type { StaffListItem } from '@/features/staff/types/staff'

interface StaffDetailsDialogProps {
  staff: StaffListItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: () => void
}

export function StaffDetailsDialog({ staff, open, onOpenChange, onEdit }: StaffDetailsDialogProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { data: detail } = useStaff(open ? staff.id : null)

  const canUpdate = useHasPermission(PERMISSIONS.staffUpdate)
  const canDelete = useHasPermission(PERMISSIONS.staffDelete)
  const updateStaff = useUpdateStaff()
  const deleteStaff = useDeleteStaff(() => {
    setConfirmOpen(false)
    onOpenChange(false)
  })

  const loaded = detail ?? staff

  const toggleStatus = () => {
    updateStaff.mutate({
      id: staff.id,
      input: { status: loaded.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Staff details</DialogTitle>
          <DialogDescription>Non-login personnel record.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="leading-tight">
              <p className="text-lg font-semibold">
                {loaded.firstName} {loaded.middleName ? `${loaded.middleName} ` : ''}
                {loaded.lastName}
              </p>
              <div className="flex items-center gap-2">
                <StatusBadge status={loaded.status} />
                <span className="text-sm text-muted-foreground">
                  {loaded.staffNumber} · {loaded.role.charAt(0) + loaded.role.slice(1).toLowerCase()}
                </span>
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{loaded.phoneNumber || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="truncate">{loaded.email || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Hire date</dt>
              <dd>
                {loaded.hireDate
                  ? new Date(loaded.hireDate).toLocaleDateString('en-PH', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Assignments</dt>
              <dd>{detail?.assignedMaintenances.length ?? 0} maintenance</dd>
            </div>
            {loaded.notes ? (
              <div className="col-span-2">
                <dt className="text-muted-foreground">Notes</dt>
                <dd>{loaded.notes}</dd>
              </div>
            ) : null}
          </dl>

          {detail?.assignedMaintenances.length ? (
            <div>
              <p className="mb-2 text-sm font-medium">Assigned maintenance</p>
              <ul className="space-y-2">
                {detail.assignedMaintenances.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Wrench className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 leading-tight">
                        <p className="truncate font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.maintenanceNumber} · {item.category.replace(/_/g, ' ').toLowerCase()}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={item.status} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center gap-2">
              {canUpdate ? (
                <Button type="button" variant="outline" onClick={toggleStatus}>
                  {loaded.status === 'ACTIVE' ? (
                    <>
                      <BadgeX className="h-4 w-4" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <BadgeCheck className="h-4 w-4" />
                      Activate
                    </>
                  )}
                </Button>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
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
              <p className="font-medium">Remove {staff.firstName} {staff.lastName}?</p>
              <p className="mt-1 text-muted-foreground">
                This marks the record as inactive and hides it. Past maintenance assignments are
                kept.
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteStaff.mutate(staff.id)}
                  disabled={deleteStaff.isPending}
                >
                  Remove
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
