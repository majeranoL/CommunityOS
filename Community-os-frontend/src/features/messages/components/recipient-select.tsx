import { useState } from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { useUsers } from '@/features/users/hooks/use-users'
import { cn } from '@/lib/utils'

interface RecipientSelectProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function RecipientSelect({ value, onChange, disabled }: RecipientSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { data, isLoading } = useUsers({
    page: 1,
    limit: 50,
    search: search || undefined,
  })

  const selected = data?.items.find((user) => user.id === value)
  const fullName = (user: { firstName: string; lastName: string }) =>
    [user.firstName, user.lastName].filter(Boolean).join(' ')

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
          {selected ? fullName(selected) : 'Select a recipient…'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="flex items-center gap-2 border-b p-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            placeholder="Search users…"
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
            data.items.map((user) => (
              <button
                key={user.id}
                type="button"
                className={cn(
                  'flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent',
                  user.id === value && 'bg-accent',
                )}
                onClick={() => {
                  onChange(user.id)
                  setOpen(false)
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate">{fullName(user)}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {user.referenceNumber} · {user.roles.map((role) => role.name).join(', ')}
                  </span>
                </span>
                {user.id === value ? <Check className="h-4 w-4 shrink-0" /> : null}
              </button>
            ))
          ) : (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">No users found.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
