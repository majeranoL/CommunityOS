import { useState } from 'react'
import { Search, UserRound } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useUsers } from '@/features/users/hooks/use-users'
import { cn } from '@/lib/utils'

interface AssignComplaintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssign: (userId: string) => void
  pending?: boolean
}

export function AssignComplaintDialog({ open, onOpenChange, onAssign, pending }: AssignComplaintDialogProps) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  const { data, isLoading } = useUsers({
    page: 1,
    limit: 50,
    search: search || undefined,
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setSearch('')
          setSelected(null)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign complaint</DialogTitle>
          <DialogDescription>Choose a member of your team to handle this complaint.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search team members…"
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 p-1">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : data?.items.length ? (
            data.items.map((userItem) => (
              <button
                key={userItem.id}
                type="button"
                onClick={() => setSelected(userItem.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent',
                  selected === userItem.id && 'bg-accent',
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <UserRound className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 leading-tight">
                  <p className="truncate font-medium">
                    {userItem.firstName} {userItem.lastName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {userItem.referenceNumber} · {userItem.roles.map((role) => role.name).join(', ')}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <p className="p-3 text-sm text-muted-foreground">No team members found.</p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!selected || pending} onClick={() => selected && onAssign(selected)}>
            {pending ? 'Assigning…' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
