import { useState } from 'react'
import { Car, Loader2, UserPlus, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/status-badge'
import { HouseholdLedger } from '@/features/households/components/household-ledger'
import { useMyHousehold } from '@/features/households/hooks/use-households'
import { useIsFeatureEnabled } from '@/features/features/hooks/use-enabled-features'
import { ResidentFormDialog } from '@/features/residents/components/resident-form-dialog'
import { VehicleFormDialog } from '@/features/vehicles/components/vehicle-form-dialog'
import { useHasPermission } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import { formatCurrency } from '@/lib/format'

const GOOD_BAD_STANDING_FEATURE = 'good-bad-standing'

function unitLabel(household: {
  block: string | null
  lot: string | null
  unit: string | null
  address: string | null
}) {
  return (
    [household.block, household.lot, household.unit, household.address]
      .filter(Boolean)
      .join(', ') || 'My household'
  )
}

export function MyBalanceCard() {
  const { data: household, isLoading, isError } = useMyHousehold()
  const canAddResident = useHasPermission(PERMISSIONS.residentCreate)
  const canAddVehicle = useHasPermission(PERMISSIONS.vehicleCreate)
  const [residentOpen, setResidentOpen] = useState(false)
  const [vehicleOpen, setVehicleOpen] = useState(false)

  const standingEnabled = useIsFeatureEnabled(GOOD_BAD_STANDING_FEATURE)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            My household balance
          </CardTitle>
          <div className="flex items-center gap-2">
            {canAddResident ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setResidentOpen(true)}
              >
                <UserPlus className="h-4 w-4" />
                Add resident
              </Button>
            ) : null}
            {canAddVehicle ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setVehicleOpen(true)}
              >
                <Car className="h-4 w-4" />
                Register vehicle
              </Button>
            ) : null}
            {household ? (
              <span className="text-sm text-muted-foreground">
                {unitLabel(household)}
              </span>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading your balance…
          </div>
        ) : isError || !household ? (
          <p className="text-sm text-muted-foreground">
            Could not load your household balance. Contact the admin if this
            persists.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex items-center gap-2">
                {standingEnabled ? (
                  <StatusBadge status={household.finance?.standing ?? '—'} />
                ) : null}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p
                  className={`text-lg font-semibold ${
                    (household.finance?.outstanding ?? 0) > 0
                      ? 'text-destructive'
                      : 'text-success'
                  }`}
                >
                  {formatCurrency(household.finance?.outstanding ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total billed</p>
                <p className="font-medium">
                  {formatCurrency(household.finance?.totalBilled ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total paid</p>
                <p className="font-medium">
                  {formatCurrency(household.finance?.totalPaid ?? 0)}
                </p>
              </div>
            </div>
            <HouseholdLedger
              assessments={household.assessments}
              finance={household.finance ?? null}
              unitLabel={unitLabel(household)}
            />
          </>
        )}
      </CardContent>

      <ResidentFormDialog
        open={residentOpen}
        onOpenChange={setResidentOpen}
        selfService
      />
      <VehicleFormDialog open={vehicleOpen} onOpenChange={setVehicleOpen} />
    </Card>
  )
}
