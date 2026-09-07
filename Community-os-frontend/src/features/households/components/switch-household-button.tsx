import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronDown, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/sonner'
import { useAuthStore } from '@/store/auth-store'
import { apiErrorMessage } from '@/lib/api'
import { householdsService } from '@/features/households/services/households'

function unitLabel(household: {
  block?: string | null
  lot?: string | null
  unit?: string | null
  address?: string | null
}) {
  return (
    [household.block, household.lot, household.unit, household.address]
      .filter(Boolean)
      .join(', ') || 'Unnamed unit'
  )
}

export function SwitchHouseholdButton() {
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const switchMutation = useMutation({
    mutationFn: (householdId: string) =>
      householdsService.switchHousehold(householdId),
    onSuccess: () => {
      setOpen(false)
      queryClient.clear()
      navigate('/app/dashboard', { replace: true })
      toast.success('Household switched. Your data has been reloaded.')
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Could not switch household.'))
    },
  })

  const households = user?.resident?.households ?? []
  const current = user?.resident?.household ?? null

  if (households.length <= 1 || !current) return null

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 px-2 text-muted-foreground"
          title="Switch household"
        >
          <Home className="h-4 w-4" />
          <span className="max-w-40 truncate text-sm">
            {unitLabel(current)}
          </span>
          <ChevronDown className="h-3.5 w-3.5" />
          <span className="sr-only">Switch household</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-0.5">
            <span className="text-sm font-medium">Switch household</span>
            <span className="text-xs font-normal text-muted-foreground">
              Data will reload for the selected unit.
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {households.map((household) => {
          const isActive = household.id === current.id
          return (
            <DropdownMenuItem
              key={household.id}
              disabled={isActive || switchMutation.isPending}
              onClick={() => switchMutation.mutate(household.id)}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="truncate">{unitLabel(household)}</span>
                <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                  {household.isPrimary ? (
                    <span className="rounded bg-muted px-1.5 py-0.5">
                      Primary
                    </span>
                  ) : null}
                  {isActive ? (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  ) : null}
                </span>
              </span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
