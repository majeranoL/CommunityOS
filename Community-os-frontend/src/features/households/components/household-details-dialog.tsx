import { useState } from 'react'
import { AlertTriangle, Home, KeyRound, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  useDeleteHousehold,
  useHousehold,
  useUpdateHousehold,
} from '@/features/households/hooks/use-households'
import { CreateRenterDialog } from '@/features/households/components/create-renter-dialog'
import { TransferOwnershipDialog } from '@/features/households/components/transfer-ownership-dialog'
import { HouseholdLedger } from '@/features/households/components/household-ledger'
import { useIsFeatureEnabled } from '@/features/features/hooks/use-enabled-features'
import { useHasPermission } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import { cn } from '@/lib/utils'
import { formatCurrency, initials } from '@/lib/format'
import type { HouseholdDetail } from '@/features/households/types/household'

const GOOD_BAD_STANDING_FEATURE = 'good-bad-standing'

interface HouseholdDetailsDialogProps {
  householdId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function unitLabel(household: HouseholdDetail) {
  return (
    [household.block, household.lot, household.unit, household.address]
      .filter(Boolean)
      .join(', ') || 'Unnamed unit'
  )
}

export function HouseholdDetailsDialog({
  householdId,
  open,
  onOpenChange,
}: HouseholdDetailsDialogProps) {
  const { data: household, isLoading } = useHousehold(householdId)
  const updateHousehold = useUpdateHousehold()
  const deleteHousehold = useDeleteHousehold(() => onOpenChange(false))
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [renterOpen, setRenterOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const canCreateUser = useHasPermission(PERMISSIONS.userCreate)
  const canUpdateHousehold = useHasPermission(PERMISSIONS.householdUpdate)

  const standingEnabled = useIsFeatureEnabled(GOOD_BAD_STANDING_FEATURE)

  const toggleStatus = () => {
    if (!household) return
    if (household.status === 'ACTIVE') {
      setConfirmOpen(true)
    } else {
      updateHousehold.mutate({ id: household.id, input: { status: 'ACTIVE' } })
    }
  }

  const ownerResident =
    household?.residents.find(
      (resident) =>
        resident.status === 'ACTIVE' && resident.residentType === 'OWNER',
    ) ?? household?.residents.find((resident) => resident.user)
  const owner = ownerResident?.user ?? null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Household</DialogTitle>
          <DialogDescription>
            {household ? unitLabel(household) : ''}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !household ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Home className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{unitLabel(household)}</p>
                  <p className="text-sm text-muted-foreground">
                    {household.residentCount} resident
                    {household.residentCount === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <StatusBadge status={household.status} />
            </div>

            <Separator />

            <div>
              <h4 className="mb-2 text-sm font-medium">Owner</h4>
              {owner ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                    <span className="text-xs font-medium">
                      {initials(owner.firstName, owner.lastName)}
                    </span>
                  </div>
                  <div className="leading-tight">
                    <p className="font-medium">
                      {owner.firstName} {owner.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {owner.account.email} · {owner.referenceNumber}
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    {ownerResident ? (
                      <StatusBadge status={ownerResident.residentType} />
                    ) : null}
                    <StatusBadge status={owner.status} />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {ownerResident
                      ? 'No linked account for the owner yet.'
                      : 'No owner recorded for this unit — anyone can register into it.'}
                  </p>
                  {household.status === 'ACTIVE' && canCreateUser ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRenterOpen(true)}
                      disabled={renterOpen}
                    >
                      <KeyRound className="h-4 w-4" />
                      Assign renter
                    </Button>
                  ) : null}
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-medium">Billing & payments</h4>
                {household.finance && standingEnabled ? (
                  <StatusBadge status={household.finance.standing} />
                ) : null}
              </div>

              {household.finance ? (
                <>
                  <div className="grid grid-cols-3 gap-2 rounded-lg border p-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Billed</p>
                      <p className="font-medium">
                        {formatCurrency(household.finance.totalBilled)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Paid</p>
                      <p className="font-medium">
                        {formatCurrency(household.finance.totalPaid)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Outstanding
                      </p>
                      <p
                        className={cn(
                          'font-medium',
                          household.finance.outstanding > 0
                            ? 'text-destructive'
                            : 'text-success',
                        )}
                      >
                        {formatCurrency(household.finance.outstanding)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {household.finance.monthsBehind === 0
                      ? 'Up to date with assessments.'
                      : `${household.finance.monthsBehind} month${
                          household.finance.monthsBehind === 1 ? '' : 's'
                        } behind on payments.`}
                  </p>
                </>
              ) : null}

              <HouseholdLedger
                assessments={household.assessments}
                finance={household.finance}
                unitLabel={unitLabel(household)}
              />
            </div>

            <div>
              <h4 className="mb-2 text-sm font-medium">Residents</h4>
              {household.residents.length ? (
                <ul className="space-y-2">
                  {household.residents.map((resident) => (
                    <li
                      key={resident.id}
                      className="flex items-center gap-3 rounded-lg border p-2"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <UserRound className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="leading-tight">
                        <p className="font-medium">
                          {resident.firstName} {resident.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {resident.residentNumber}
                        </p>
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        {resident.user ? (
                          <Badge variant="secondary">Has account</Badge>
                        ) : null}
                        <StatusBadge status={resident.residentType} />
                        <StatusBadge status={resident.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No residents recorded for this unit.
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {household?.status === 'ACTIVE' ? (
            <Button
              variant="outline"
              className="text-warning hover:text-warning"
              onClick={toggleStatus}
              disabled={updateHousehold.isPending}
            >
              Deactivate unit
            </Button>
          ) : null}
          {canUpdateHousehold && household ? (
            <Button
              variant="outline"
              onClick={() => setTransferOpen(true)}
              disabled={transferOpen}
            >
              Transfer ownership
            </Button>
          ) : null}
          {household?.status === 'INACTIVE' ? (
            <Button
              variant="outline"
              onClick={toggleStatus}
              disabled={updateHousehold.isPending}
            >
              Activate unit
            </Button>
          ) : null}
          {household ? (
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                if (
                  window.confirm(`Delete household ${unitLabel(household)}?`)
                ) {
                  deleteHousehold.mutate(household.id)
                }
              }}
              disabled={deleteHousehold.isPending}
            >
              Delete
            </Button>
          ) : null}
        </DialogFooter>

        <CreateRenterDialog
          householdId={household?.id ?? null}
          unitLabel={household ? unitLabel(household) : ''}
          open={renterOpen}
          onOpenChange={setRenterOpen}
        />

        <TransferOwnershipDialog
          householdId={household?.id ?? null}
          open={transferOpen}
          onOpenChange={setTransferOpen}
        />

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Deactivate this unit?</DialogTitle>
              <DialogDescription>
                The unit will be freed and the current family's account will be
                deactivated — they will no longer be able to sign in.
              </DialogDescription>
            </DialogHeader>
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                A new family can register into this unit later, inheriting its
                assessment and payment history.
              </AlertDescription>
            </Alert>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  if (household) {
                    updateHousehold.mutate({
                      id: household.id,
                      input: { status: 'INACTIVE' },
                    })
                  }
                  setConfirmOpen(false)
                }}
                disabled={updateHousehold.isPending}
              >
                Deactivate unit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
