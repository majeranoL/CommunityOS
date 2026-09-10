import { useState } from 'react'
import { CreditCard, Loader2, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMyHousehold } from '@/features/households/hooks/use-households'
import { DuesTable } from '@/features/finance/components/dues-table'
import { PaymentFormDialog } from '@/features/finance/components/payment-form-dialog'
import { OnlineCheckoutDialog } from '@/features/finance/components/online-checkout-dialog'
import { useHasPermission } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import { useIsFeatureEnabled } from '@/features/features/hooks/use-enabled-features'
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

export function MyDuesTab() {
  const { data: household, isLoading, isError } = useMyHousehold()
  const canPay = useHasPermission(PERMISSIONS.paymentCreate)
  const creditsEnabled = useIsFeatureEnabled('household-credit')
  const [payOpen, setPayOpen] = useState(false)
  const [onlineOpen, setOnlineOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading your household balance…
      </div>
    )
  }

  if (isError || !household) {
    return (
      <p className="text-sm text-muted-foreground py-8">
        Could not load your household balance. Contact the admin if this persists.
      </p>
    )
  }

  const outstanding = household.finance?.outstanding ?? 0
  const availableCredit = Number(household.finance?.availableCredit ?? 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div>
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className={`text-lg font-semibold ${outstanding > 0 ? 'text-destructive' : 'text-success'}`}>
              {formatCurrency(outstanding)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total billed</p>
            <p className="font-medium">{formatCurrency(household.finance?.totalBilled ?? 0)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total paid</p>
            <p className="font-medium">{formatCurrency(household.finance?.totalPaid ?? 0)}</p>
          </div>
          {creditsEnabled ? (
            <div>
              <p className="text-xs text-muted-foreground">Available credit</p>
              <p className="font-medium text-emerald-600">
                {formatCurrency(availableCredit)}
              </p>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canPay && outstanding > 0 ? (
            <Button size="sm" onClick={() => setPayOpen(true)}>
              <Wallet className="h-4 w-4" />
              Pay now
            </Button>
          ) : null}
          {canPay ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOnlineOpen(true)}
            >
              <CreditCard className="h-4 w-4" />
              Pay online
            </Button>
          ) : null}
        </div>
      </div>

      <DuesTable
        assessments={household.assessments}
        finance={household.finance ?? null}
        unitLabel={unitLabel(household)}
      />

      <PaymentFormDialog open={payOpen} onOpenChange={setPayOpen} />
      <OnlineCheckoutDialog
        open={onlineOpen}
        onOpenChange={setOnlineOpen}
        householdId={household.id}
      />
    </div>
  )
}
