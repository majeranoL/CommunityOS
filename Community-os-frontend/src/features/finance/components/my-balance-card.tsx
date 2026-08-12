import { Loader2, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/status-badge'
import { HouseholdLedger } from '@/features/households/components/household-ledger'
import { useMyHousehold } from '@/features/households/hooks/use-households'
import { formatCurrency } from '@/lib/format'

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

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            My household balance
          </CardTitle>
          {household ? (
            <span className="text-sm text-muted-foreground">
              {unitLabel(household)}
            </span>
          ) : null}
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
                <StatusBadge status={household.finance?.standing ?? '—'} />
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
    </Card>
  )
}
