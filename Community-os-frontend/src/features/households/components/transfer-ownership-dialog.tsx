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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useHousehold, useTransferOwnership } from '@/features/households/hooks/use-households'

interface TransferOwnershipDialogProps {
  householdId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TransferOwnershipDialog({
  householdId,
  open,
  onOpenChange,
}: TransferOwnershipDialogProps) {
  const { data: household } = useHousehold(open ? householdId : null)
  const [residentId, setResidentId] = useState('')
  const transferOwnership = useTransferOwnership(() => onOpenChange(false))

  const activeResidents =
    household?.residents.filter((resident) => resident.status === 'ACTIVE') ?? []

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setResidentId('')
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer ownership</DialogTitle>
          <DialogDescription>
            Transfer this unit's ownership to another active resident. The current
            owner becomes a renter.
          </DialogDescription>
        </DialogHeader>

        {activeResidents.length ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">New owner</p>
            <Select value={residentId} onValueChange={setResidentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a resident" />
              </SelectTrigger>
              <SelectContent>
                {activeResidents.map((resident) => (
                  <SelectItem key={resident.id} value={resident.id}>
                    {resident.firstName} {resident.lastName}
                    {resident.residentType === 'OWNER' ? ' (current owner)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No active residents to transfer ownership to.
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!residentId || transferOwnership.isPending}
            onClick={() => {
              if (householdId && residentId) {
                transferOwnership.mutate({
                  id: householdId,
                  newOwnerResidentId: residentId,
                })
              }
            }}
          >
            {transferOwnership.isPending ? 'Transferring…' : 'Transfer ownership'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
