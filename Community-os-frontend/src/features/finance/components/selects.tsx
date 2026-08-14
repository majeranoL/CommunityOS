import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormControl } from '@/components/ui/form'
import { useBillingPeriods, useChargeTypes } from '@/features/finance/hooks/use-finance'
import { toTitleCase } from '@/lib/format'

export function ChargeTypeSelect({
  value,
  onChange,
  disabled,
  includeInactive = false,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  includeInactive?: boolean
}) {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useChargeTypes({
    page: 1,
    limit: 100,
    search: search || undefined,
  })

  const items = includeInactive ? (data?.items ?? []) : (data?.items ?? []).filter((item) => item.isActive)

  return (
    <div className="space-y-2">
      <Input
        placeholder="Search charge types…"
        value={search}
        disabled={disabled}
        onChange={(event) => setSearch(event.target.value)}
      />
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder={isLoading ? 'Loading…' : 'Select a charge type'} />
          </SelectTrigger>
        </FormControl>
        <SelectContent className="max-h-64">
          {items.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.name} · {item.code}
              {!item.isActive ? ' (inactive)' : ''}
            </SelectItem>
          ))}
          {items.length === 0 && !isLoading ? (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">No charge types found.</p>
          ) : null}
        </SelectContent>
      </Select>
    </div>
  )
}

export function BillingPeriodSelect({
  value,
  onChange,
  disabled,
  chargeTypeId,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  chargeTypeId?: string
}) {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useBillingPeriods({
    page: 1,
    limit: 100,
    search: search || undefined,
    ...(chargeTypeId ? { chargeTypeId } : {}),
  })

  return (
    <div className="space-y-2">
      <Input
        placeholder="Search billing periods…"
        value={search}
        disabled={disabled}
        onChange={(event) => setSearch(event.target.value)}
      />
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder={isLoading ? 'Loading…' : 'Select a billing period'} />
          </SelectTrigger>
        </FormControl>
        <SelectContent className="max-h-64">
          {data?.items.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.label} · {toTitleCase(item.status)}
            </SelectItem>
          ))}
          {data?.items.length === 0 && !isLoading ? (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">No billing periods found.</p>
          ) : null}
        </SelectContent>
      </Select>
    </div>
  )
}
