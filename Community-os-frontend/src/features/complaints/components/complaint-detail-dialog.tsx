import { useState } from 'react'
import { UserRound, CheckCircle2, XCircle, Paperclip, FileText, ExternalLink, Image as ImageIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { documentsService } from '@/features/documents/services/documents'
import { SecureImage } from '@/components/shared/secure-image'
import {
  useAssignComplaint,
  useCloseComplaint,
  useComplaint,
  useResolveComplaint,
} from '@/features/complaints/hooks/use-complaints'
import { AssignComplaintDialog } from '@/features/complaints/components/assign-complaint-dialog'
import { useHasPermission } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import { StatusBadge } from '@/components/shared/status-badge'
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS } from '@/features/complaints/validation/complaint'
import { formatDate } from '@/lib/format'

interface ComplaintDetailDialogProps {
  complaintId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function optionLabel(options: readonly { value: string; label: string }[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value
}

export function ComplaintDetailDialog({ complaintId, open, onOpenChange }: ComplaintDetailDialogProps) {
  const { data: complaint, isLoading } = useComplaint(complaintId)
  const [assignOpen, setAssignOpen] = useState(false)
  const [resolutionRemarks, setResolutionRemarks] = useState('')
  const [resolving, setResolving] = useState(false)
  const [closing, setClosing] = useState(false)

  const assignComplaint = useAssignComplaint()
  const resolveComplaint = useResolveComplaint()
  const closeComplaint = useCloseComplaint()

  const canAssign = useHasPermission(PERMISSIONS.complaintAssign)
  const canResolve = useHasPermission(PERMISSIONS.complaintResolve)

  const status = complaint?.status
  const isPending = assignComplaint.isPending || resolveComplaint.isPending || closeComplaint.isPending

  const handleResolve = () => {
    if (!complaintId) return
    resolveComplaint.mutate(
      { id: complaintId, resolutionRemarks: resolutionRemarks || undefined },
      {
        onSuccess: () => {
          setResolving(false)
          setResolutionRemarks('')
        },
      },
    )
  }

  const handleClose = () => {
    if (!complaintId) return
    closeComplaint.mutate(complaintId, { onSuccess: () => setClosing(false) })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{complaint?.complaintNumber}</DialogTitle>
          <DialogDescription>{complaint?.resident?.fullName}</DialogDescription>
        </DialogHeader>

        {isLoading || !complaint ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={complaint.status} />
              <Badge variant="secondary">{optionLabel(CATEGORY_OPTIONS, complaint.category)}</Badge>
              <Badge
                variant={
                  complaint.priority === 'URGENT' || complaint.priority === 'HIGH'
                    ? 'destructive'
                    : complaint.priority === 'MEDIUM'
                      ? 'warning'
                      : 'muted'
                }
              >
                {optionLabel(PRIORITY_OPTIONS, complaint.priority)}
              </Badge>
            </div>

            <div>
              <h3 className="text-lg font-semibold">{complaint.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">Filed {formatDate(complaint.createdAt)}</p>
            </div>

            <Separator />

            <p className="whitespace-pre-wrap text-sm leading-relaxed">{complaint.description}</p>

            {complaint.remarks ? (
              <div className="rounded-md border bg-muted/40 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Remarks</p>
                <p className="mt-1 text-sm">{complaint.remarks}</p>
              </div>
            ) : null}

            {complaint.attachments && complaint.attachments.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5" />
                  Attachments ({complaint.attachments.length})
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {complaint.attachments.map((att) => {
                    const isImg = att.mimetype?.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(att.originalName || att.filename)
                    return (
                      <div
                        key={att.id}
                        className="group relative flex flex-col items-center overflow-hidden rounded-md border bg-card p-2 text-xs transition-all hover:border-primary/50"
                      >
                        {isImg ? (
                          <div className="relative aspect-video w-full overflow-hidden rounded bg-muted flex items-center justify-center">
                            <SecureImage
                              src={att.url}
                              alt={att.originalName}
                              className="h-full w-full object-cover"
                            />
                            <ImageIcon className="h-5 w-5 text-muted-foreground absolute" />
                          </div>
                        ) : (
                          <div className="flex h-12 w-full items-center justify-center rounded bg-primary/10 text-primary">
                            <FileText className="h-6 w-6" />
                          </div>
                        )}
                        <p className="mt-1.5 w-full truncate font-medium text-center" title={att.originalName}>
                          {att.originalName}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-1 h-7 w-full gap-1 text-[11px]"
                          onClick={() => documentsService.openFile({ fileUrl: att.url })}
                        >
                          <ExternalLink className="h-3 w-3" />
                          View
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}

            <div className="flex items-center gap-2 rounded-md border p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <UserRound className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-sm">
                <p className="font-medium">{complaint.resident.fullName}</p>
                <p className="text-xs text-muted-foreground">Reporter</p>
              </div>
            </div>

            {complaint.assignedTo ? (
              <div className="flex items-center gap-2 rounded-md border p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <UserRound className="h-4 w-4 text-primary" />
                </div>
                <div className="text-sm">
                  <p className="font-medium">{complaint.assignedTo.fullName}</p>
                  <p className="text-xs text-muted-foreground">Assigned to</p>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {resolving ? (
          <div className="space-y-2">
            <Label>Resolution notes</Label>
            <Textarea
              placeholder="What was done to resolve this complaint?"
              rows={3}
              value={resolutionRemarks}
              onChange={(event) => setResolutionRemarks(event.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setResolving(false)}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleResolve} disabled={isPending}>
                Confirm resolution
              </Button>
            </div>
          </div>
        ) : null}

        {closing ? (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setClosing(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleClose} disabled={isPending}>
              Confirm close
            </Button>
          </div>
        ) : null}

        {!resolving && !closing ? (
          <DialogFooter className="gap-2">
            {status === 'OPEN' && canAssign ? (
              <Button variant="outline" onClick={() => setAssignOpen(true)}>
                Assign
              </Button>
            ) : null}
            {(status === 'OPEN' || status === 'IN_PROGRESS') && canResolve ? (
              <Button onClick={() => setResolving(true)}>
                <CheckCircle2 className="h-4 w-4" />
                Mark resolved
              </Button>
            ) : null}
            {status === 'RESOLVED' && canResolve ? (
              <Button onClick={() => setClosing(true)}>
                <XCircle className="h-4 w-4" />
                Close complaint
              </Button>
            ) : null}
          </DialogFooter>
        ) : null}

        <AssignComplaintDialog
          open={assignOpen}
          onOpenChange={setAssignOpen}
          pending={assignComplaint.isPending}
          onAssign={(userId) => {
            if (complaintId) assignComplaint.mutate({ id: complaintId, assignedToId: userId })
            setAssignOpen(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
