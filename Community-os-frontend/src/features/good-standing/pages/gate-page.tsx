import { useState } from 'react'
import { Loader2, ScanLine, X } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  useVerifyQrPass,
  type GoodStandingVerification,
} from '@/features/good-standing/hooks/use-good-standing'
import { formatDateTime } from '@/lib/format'

function unitLabel(household: GoodStandingVerification['household']) {
  return (
    [household.block, household.lot, household.unit, household.address]
      .filter(Boolean)
      .join(', ') || '—'
  )
}

export default function GatePage() {
  const [token, setToken] = useState('')
  const [result, setResult] = useState<GoodStandingVerification | null>(null)

  const verify = useVerifyQrPass((data) => setResult(data))

  const reset = () => {
    setResult(null)
    setToken('')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gate pass verification"
        description="Verify a Good Standing pass presented at the gate."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ScanLine className="h-4 w-4 text-muted-foreground" />
              Enter pass token
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ask the resident for their Good Standing pass and enter its token
              below.
            </p>
            <div className="flex gap-2">
              <Input
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Paste or type the pass token"
                className="font-mono"
                autoComplete="off"
              />
              <Button
                type="button"
                onClick={() => verify.mutate(token.trim())}
                disabled={!token.trim() || verify.isPending}
              >
                {verify.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Verify
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Verification result</CardTitle>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={result.standing} />
                  <span className="text-sm text-muted-foreground">
                    {result.standing === 'GOOD'
                      ? 'Household is in good standing.'
                      : 'Household is NOT in good standing.'}
                  </span>
                  {result.standing !== result.issuedStanding ? (
                    <span className="text-xs text-muted-foreground">
                      Pass was issued as {result.issuedStanding}
                    </span>
                  ) : null}
                </div>
                <div className="rounded-md border p-3 text-sm">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Household
                  </p>
                  <p className="mt-1 font-medium">
                    {unitLabel(result.household)}
                  </p>
                  {result.household.residents.length > 0 ? (
                    <p className="mt-1 text-muted-foreground">
                      {result.household.residents
                        .map((resident) => resident.fullName)
                        .join(', ')}
                    </p>
                  ) : (
                    <p className="mt-1 text-muted-foreground">
                      No residents linked.
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Pass valid until {formatDateTime(result.expiresAt)}. Token{' '}
                  <span className="font-mono">{result.token}</span>
                </p>
                <Button type="button" variant="outline" onClick={reset}>
                  <X className="h-4 w-4" />
                  New check
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No verification yet. Enter a pass token to check a household's
                standing.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
