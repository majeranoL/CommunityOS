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
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useCreateUtilityConfig,
  useUpdateUtilityConfig,
} from '@/features/finance/hooks/use-finance'
import { UTILITY_TYPES } from '@/features/finance/validation/finance'
import { toTitleCase } from '@/lib/format'
import type {
  UtilityBillingConfig,
  UtilityRateMode,
  UtilityType,
} from '@/features/finance/types/finance'

export function UtilityRateDialog({
  onOpenChange,
  config,
}: {
  onOpenChange: (open: boolean) => void
  config?: UtilityBillingConfig | null
}) {
  const isEdit = Boolean(config)
  const create = useCreateUtilityConfig(() => onOpenChange(false))
  const update = useUpdateUtilityConfig(() => onOpenChange(false))

  const [utilityType, setUtilityType] = useState<UtilityType>(config?.utilityType ?? 'WATER')
  const [name, setName] = useState(config?.name ?? '')
  const [rateMode, setRateMode] = useState<UtilityRateMode>(config?.rateMode ?? 'METERED')
  const [unitRate, setUnitRate] = useState(
    config?.unitRate != null ? String(config.unitRate) : '',
  )
  const [fixedRate, setFixedRate] = useState(
    config?.fixedRate != null ? String(config.fixedRate) : '',
  )
  const [isActive, setIsActive] = useState(config?.isActive ?? true)

  const pending = create.isPending || update.isPending

  const handleSubmit = () => {
    const input =
      rateMode === 'METERED'
        ? { unitRate: Number(unitRate) || undefined }
        : { fixedRate: Number(fixedRate) || undefined }

    if (isEdit && config) {
      update.mutate({
        id: config.id,
        input: { name: name || undefined, ...input, isActive },
      })
    } else {
      create.mutate({
        utilityType,
        name: name || undefined,
        rateMode,
        ...input,
        isActive,
      })
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit utility rate' : 'Add utility rate'}</DialogTitle>
          <DialogDescription>
            Choose how this utility is billed to each household.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Utility</Label>
              <Select
                value={utilityType}
                onValueChange={(value) => setUtilityType(value as UtilityType)}
                disabled={isEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UTILITY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {toTitleCase(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="utility-rate-name">Label (optional)</Label>
              <Input
                id="utility-rate-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Water – common meter"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Billing method</Label>
            <Select
              value={rateMode}
              onValueChange={(value) => setRateMode(value as UtilityRateMode)}
              disabled={isEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="METERED">Per usage (meter reading)</SelectItem>
                <SelectItem value="FIXED">Fixed amount per household</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {rateMode === 'METERED' ? (
            <div className="space-y-1.5">
              <Label htmlFor="utility-unit-rate">Rate per unit consumed</Label>
              <Input
                id="utility-unit-rate"
                type="number"
                min="0"
                step="0.0001"
                value={unitRate}
                onChange={(event) => setUnitRate(event.target.value)}
                placeholder="e.g. 12.50"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="utility-fixed-rate">Amount per household</Label>
              <Input
                id="utility-fixed-rate"
                type="number"
                min="0"
                step="0.01"
                value={fixedRate}
                onChange={(event) => setFixedRate(event.target.value)}
                placeholder="e.g. 200"
              />
            </div>
          )}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <p className="text-sm font-medium">Active</p>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isEdit ? 'Save changes' : 'Add rate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
