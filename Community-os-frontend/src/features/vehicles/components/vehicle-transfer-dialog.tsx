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
import { Label } from '@/components/ui/label'
import { ResidentSelect } from '@/features/facilities/components/resident-select'
import { useTransferVehicle } from '@/features/vehicles/hooks/use-vehicles'
import type { VehicleListItem } from '@/features/vehicles/types/vehicle'

interface VehicleTransferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicle: VehicleListItem | null
}

export function VehicleTransferDialog({
  open,
  onOpenChange,
  vehicle,
}: VehicleTransferDialogProps) {
  const [residentId, setResidentId] = useState('')
  const transferVehicle = useTransferVehicle(() => onOpenChange(false))

  const pending = transferVehicle.isPending

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
          <DialogTitle>Transfer vehicle</DialogTitle>
          <DialogDescription>
            Reassign {vehicle?.plateNumber} to another resident.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>New owner</Label>
          <ResidentSelect value={residentId} onChange={setResidentId} />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!residentId || pending}
            onClick={() => {
              if (vehicle && residentId) {
                transferVehicle.mutate({ id: vehicle.id, newResidentId: residentId })
              }
            }}
          >
            {pending ? 'Transferring…' : 'Transfer vehicle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
