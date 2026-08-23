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
import { useChargeTypes, useUpdateChargeType } from '@/features/finance/hooks/use-finance'
import type { ChargeType } from '@/features/finance/types/finance'

export function DuesSettingsDialog({
  onOpenChange,
}: {
  onOpenChange: (open: boolean) => void
}) {
  const { data, isLoading } = useChargeTypes({ category: 'DUES', limit: 50 })
  const chargeTypes = data?.items ?? []
  const active: ChargeType | undefined =
    chargeTypes.find((item) => item.isActive) ?? chargeTypes[0]

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Monthly dues settings</DialogTitle>
          <DialogDescription>
            {active
              ? `Applies to "${active.name}". Changes affect future billing runs.`
              : 'No monthly dues charge type found yet.'}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : active ? (
          <DuesSettingsForm key={active.id} chargeType={active} onDone={() => onOpenChange(false)} />
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DuesSettingsForm({
  chargeType,
  onDone,
}: {
  chargeType: ChargeType
  onDone: () => void
}) {
  const [amount, setAmount] = useState(String(chargeType.amount))
  const [dueDay, setDueDay] = useState(
    chargeType.dueDay != null ? String(chargeType.dueDay) : '',
  )
  const [gracePeriodDays, setGracePeriodDays] = useState(
    String(chargeType.gracePeriodDays ?? 0),
  )
  const [lateFeeType, setLateFeeType] = useState<'NONE' | 'FIXED_AMOUNT' | 'PERCENT'>(
    chargeType.lateFeeType ?? 'NONE',
  )
  const [lateFeeValue, setLateFeeValue] = useState(
    chargeType.lateFeeValue != null ? String(chargeType.lateFeeValue) : '',
  )
  const [autoGenerate, setAutoGenerate] = useState(Boolean(chargeType.autoGenerate))

  const update = useUpdateChargeType(onDone)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="dues-amount">Amount per month</Label>
          <Input
            id="dues-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dues-day">Due day of month</Label>
          <Input
            id="dues-day"
            type="number"
            min="1"
            max="28"
            value={dueDay}
            onChange={(event) => setDueDay(event.target.value)}
            placeholder="e.g. 5"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="dues-grace">Grace period (days)</Label>
          <Input
            id="dues-grace"
            type="number"
            min="0"
            value={gracePeriodDays}
            onChange={(event) => setGracePeriodDays(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Late fee</Label>
          <Select
            value={lateFeeType}
            onValueChange={(value) =>
              setLateFeeType(value as 'NONE' | 'FIXED_AMOUNT' | 'PERCENT')
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">None</SelectItem>
              <SelectItem value="FIXED_AMOUNT">Fixed amount</SelectItem>
              <SelectItem value="PERCENT">Percent of balance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {lateFeeType !== 'NONE' ? (
        <div className="space-y-1.5">
          <Label htmlFor="dues-late-fee">
            Late fee value ({lateFeeType === 'PERCENT' ? '%' : 'amount'})
          </Label>
          <Input
            id="dues-late-fee"
            type="number"
            min="0"
            step="0.01"
            value={lateFeeValue}
            onChange={(event) => setLateFeeValue(event.target.value)}
          />
        </div>
      ) : null}
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Generate automatically each month</p>
          <p className="text-xs text-muted-foreground">
            Creates the current month&apos;s dues for every active household.
          </p>
        </div>
        <Switch checked={autoGenerate} onCheckedChange={setAutoGenerate} />
      </div>
      <Button className="w-full" onClick={() =>
        update.mutate({
          id: chargeType.id,
          input: {
            amount: Number(amount) || undefined,
            dueDay: dueDay ? Number(dueDay) : undefined,
            gracePeriodDays: Math.max(0, Math.floor(Number(gracePeriodDays) || 0)),
            lateFeeType,
            lateFeeValue: lateFeeType === 'NONE' ? null : Number(lateFeeValue) || undefined,
            autoGenerate,
          },
        })
      }
        disabled={update.isPending}
      >
        {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Save settings
      </Button>
    </div>
  )
}
