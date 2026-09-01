import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { BadgeCheck, Loader2, ShieldX } from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'
import api from '@/lib/api'
import type { ApiEnvelope } from '@/types/api'
import type { HouseholdStanding } from '@/features/good-standing/types/good-standing'
import { formatDateTime } from '@/lib/format'

interface PublicGoodStanding {
  verified: boolean
  standing: HouseholdStanding | null
  issuedStanding: HouseholdStanding | null
  expiresAt: string | null
  community: {
    id: string
    slug: string
    displayName: string
  } | null
  household: {
    id: string
    block: string | null
    lot: string | null
    unit: string | null
    address: string | null
  } | null
}

function unitLabel(
  household: PublicGoodStanding['household'],
): string | null {
  if (!household) return null
  return (
    [household.block, household.lot, household.unit, household.address]
      .filter(Boolean)
      .join(', ') || 'Household'
  )
}

export default function GoodStandingPublicPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<PublicGoodStanding | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    api
      .get<ApiEnvelope<PublicGoodStanding>>(
        `/public/good-standing/${encodeURIComponent(token)}`,
      )
      .then((res) => setData(res.data.data))
      .catch(() => setError('Could not verify this pass.'))
  }, [token])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
        {error ? (
          <div className="space-y-3">
            <ShieldX className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="text-lg font-semibold">Pass verification failed</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verifying pass…
          </div>
        ) : !data.verified || data.standing !== 'GOOD' ? (
          <div className="space-y-3">
            <ShieldX className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="text-lg font-semibold">
              Household is not in good standing
            </h1>
            <p className="text-sm text-muted-foreground">
              This pass is expired or the household is not currently in good
              standing.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <BadgeCheck className="mx-auto h-12 w-12 text-success" />
            <div className="flex items-center justify-center gap-2">
              <StatusBadge status={data.standing} />
              <span className="font-medium">In good standing</span>
            </div>
            {data.community ? (
              <div className="rounded-md border p-3 text-sm">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Community
                </p>
                <p className="mt-1 font-medium">
                  {data.community.displayName}
                </p>
                {unitLabel(data.household) ? (
                  <p className="mt-1 text-muted-foreground">
                    {unitLabel(data.household)}
                  </p>
                ) : null}
              </div>
            ) : null}
            {data.expiresAt ? (
              <p className="text-xs text-muted-foreground">
                Pass valid until {formatDateTime(data.expiresAt)}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
