import { useState } from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { useStaffList } from '@/features/staff/hooks/use-staff'
import type { StaffListItem } from '@/features/staff/types/staff'
import { cn } from '@/lib/utils'

interface StaffSelectProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function StaffSelect({ value, onChange, disabled }: StaffSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { data, isLoading } = useStaffList({
    page: 1,
    limit: 25,
    search: search || undefined,
    status: 'ACTIVE',
  })

  const selected = data?.items.find((member) => member.id === value)
  const fullName = (member: StaffListItem) =>
    [member.firstName, member.middleName, member.lastName].filter(Boolean).join(' ')

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
          {selected ? fullName(selected) : 'Select a staff member…'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="flex items-center gap-2 border-b p-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            placeholder="Search staff…"
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
            data.items.map((member) => (
              <button
                key={member.id}
                type="button"
                className={cn(
                  'flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent',
                  member.id === value && 'bg-accent',
                )}
                onClick={() => {
                  onChange(member.id)
                  setOpen(false)
                }}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate">{fullName(member)}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {member.staffNumber}
                  </span>
                </span>
                {member.id === value ? <Check className="h-4 w-4 shrink-0" /> : null}
              </button>
            ))
          ) : (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">No staff found.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
