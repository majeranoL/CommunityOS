import { useState } from 'react'
import { Loader2 } from 'lucide-react'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { HouseholdSelect } from '@/features/finance/components/household-select'
import {
  useCreateUtilityReading,
  useUpdateUtilityReading,
  useUtilityConfigs,
} from '@/features/finance/hooks/use-finance'
import { toTitleCase } from '@/lib/format'
import type { UtilityBillingConfig, UtilityReading } from '@/features/finance/types/finance'

function currentPeriodKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function UtilityReadingDialog({
  onOpenChange,
  reading,
  defaultPeriodKey,
}: {
  onOpenChange: (open: boolean) => void
  reading?: UtilityReading | null
  defaultPeriodKey?: string
}) {
  const isEdit = Boolean(reading)
  const create = useCreateUtilityReading(() => onOpenChange(false))
  const update = useUpdateUtilityReading(() => onOpenChange(false))

  const { data: configData } = useUtilityConfigs({ limit: 50 })
  const configs = (configData?.items ?? []).filter((item) => item.isActive)

  const [configId, setConfigId] = useState(reading?.utilityConfigId ?? '')
  const [householdId, setHouseholdId] = useState(reading?.household.id ?? '')
  const [periodKey, setPeriodKey] = useState(reading?.periodKey ?? defaultPeriodKey ?? currentPeriodKey())
  const [currentReading, setCurrentReading] = useState(
    reading?.currentReading != null ? String(reading.currentReading) : '',
  )
  const [readingDate, setReadingDate] = useState(
    reading
      ? new Date(reading.readingDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  )
  const [notes, setNotes] = useState(reading?.notes ?? '')

  const pending = create.isPending || update.isPending

  const handleSubmit = () => {
    if (isEdit && reading) {
      update.mutate({
        id: reading.id,
        input: {
          currentReading: Number(currentReading),
          readingDate,
          notes: notes || undefined,
        },
      })
    } else if (configId && householdId) {
      create.mutate({
        utilityConfigId: configId,
        householdId,
        periodKey,
        currentReading: Number(currentReading),
        readingDate,
        notes: notes || undefined,
      })
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit meter reading' : 'Record meter reading'}</DialogTitle>
          <DialogDescription>
            The previous reading is carried forward automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!isEdit ? (
            <>
              <div className="space-y-1.5">
                <Label>Utility</Label>
                <Select value={configId} onValueChange={setConfigId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select utility" />
                  </SelectTrigger>
                  <SelectContent>
                    {configs.map((config: UtilityBillingConfig) => (
                      <SelectItem key={config.id} value={config.id}>
                        {toTitleCase(config.utilityType)}
                        {config.name ? ` – ${config.name}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Household</Label>
                <HouseholdSelect value={householdId} onChange={setHouseholdId} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="reading-period">Billing month</Label>
                  <Input
                    id="reading-period"
                    type="month"
                    value={periodKey}
                    onChange={(event) => setPeriodKey(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reading-date">Reading date</Label>
                  <Input
                    id="reading-date"
                    type="date"
                    value={readingDate}
                    onChange={(event) => setReadingDate(event.target.value)}
                  />
                </div>
              </div>
            </>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="reading-value">Current reading</Label>
            <Input
              id="reading-value"
              type="number"
              min="0"
              step="0.001"
              value={currentReading}
              onChange={(event) => setCurrentReading(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reading-notes">Notes (optional)</Label>
            <Textarea
              id="reading-notes"
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              pending ||
              !currentReading ||
              (!isEdit && (!configId || !householdId))
            }
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isEdit ? 'Save changes' : 'Record reading'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
