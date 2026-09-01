import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Loader2, ScanLine, ScanBarcode, X } from 'lucide-react'
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

function tokenFromEntry(entry: string) {
  const trimmed = entry.trim()
  let match = trimmed.match(/\/verify\/([A-Za-z0-9]+)/)
  if (match) return match[1]
  match = trimmed.match(/good-standing\/([A-Za-z0-9]+)/)
  if (match) return match[1]
  return trimmed
}

export default function GatePage() {
  const [token, setToken] = useState('')
  const [result, setResult] = useState<GoodStandingVerification | null>(null)
  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scanRegionId = 'good-standing-qr-scanner'

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current
        .stop()
        .then(() => scannerRef.current?.clear())
        .catch(() => {})
        .finally(() => {
          scannerRef.current = null
          setScanning(false)
        })
    } else {
      setScanning(false)
    }
  }

  const verify = useVerifyQrPass((data) => {
    setResult(data)
    stopScanner()
  })

  const startScanner = () => {
    setCameraError(null)
    if (scannerRef.current) return

    const scanner = new Html5Qrcode(scanRegionId)
    scannerRef.current = scanner
    setScanning(true)

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          const decoded = tokenFromEntry(decodedText)
          if (decoded) {
            verify.mutate(decoded)
          }
        },
        () => {},
      )
      .catch(() => {
        setCameraError(
          'Could not access the camera. Use the manual token entry below instead.',
        )
        stopScanner()
      })
  }

  const reset = () => {
    setResult(null)
    setToken('')
  }

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {})
          .then(() => scannerRef.current?.clear())
        scannerRef.current = null
      }
    }
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gate pass verification"
        description="Scan a Good Standing pass presented at the gate."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ScanBarcode className="h-4 w-4 text-muted-foreground" />
                Scan QR pass
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Point the camera at the resident's QR pass to verify their
                standing automatically.
              </p>
              {scanning ? (
                <div>
                  <div
                    id={scanRegionId}
                    className="w-full overflow-hidden rounded-md"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={stopScanner}
                  >
                    <X className="h-4 w-4" />
                    Stop scanning
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={startScanner}
                  disabled={verify.isPending}
                >
                  <ScanLine className="h-4 w-4" />
                  Start camera
                </Button>
              )}
              {cameraError ? (
                <p className="text-sm text-destructive">{cameraError}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ScanLine className="h-4 w-4 text-muted-foreground" />
                Enter pass token
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Ask the resident for their Good Standing pass and enter its
                token below.
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
                  onClick={() => verify.mutate(tokenFromEntry(token))}
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
        </div>

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
                No verification yet. Scan a pass or enter a token to check a
                household's standing.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
