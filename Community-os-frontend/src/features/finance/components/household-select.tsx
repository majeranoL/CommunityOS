import { useState } from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { useHouseholdOptions } from '@/features/finance/hooks/use-finance'
import { cn } from '@/lib/utils'

interface HouseholdSelectProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function householdLabel(household: {
  block: string | null
  lot: string | null
  unit: string | null
  address?: string | null
}) {
  const parts = [
    household.block ? `Blk ${household.block}` : null,
    household.lot ? `Lot ${household.lot}` : null,
    household.unit ? `Unit ${household.unit}` : null,
    household.address ?? null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : 'Unnamed household'
}

export function HouseholdSelect({ value, onChange, disabled }: HouseholdSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { data, isLoading } = useHouseholdOptions(search)

  const selected = data?.items.find((household) => household.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {selected ? householdLabel(selected) : 'Select a household…'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="flex items-center gap-2 border-b p-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            placeholder="Search households…"
            className="border-0 focus-visible:ring-0"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {isLoading ? (
            <div className="space-y-2 p-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : data?.items.length ? (
            data.items.map((household) => (
              <button
                key={household.id}
                type="button"
                className={cn(
                  'flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent',
                  household.id === value && 'bg-accent',
                )}
                onClick={() => {
                  onChange(household.id)
                  setOpen(false)
                }}
              >
                {householdLabel(household)}
                {household.id === value ? <Check className="h-4 w-4 shrink-0" /> : null}
              </button>
            ))
          ) : (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">No households found.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
