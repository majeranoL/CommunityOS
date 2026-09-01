import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { BadgeCheck, Loader2, QrCode, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/status-badge'
import { useGenerateQrPass } from '@/features/good-standing/hooks/use-good-standing'
import type { GoodStandingQR } from '@/features/good-standing/types/good-standing'
import { apiErrorMessage } from '@/lib/api'
import { formatDateTime } from '@/lib/format'

function passUrl(token: string) {
  return `${window.location.origin}/verify/${token}`
}

export function GoodStandingPassCard({ householdId }: { householdId: string }) {
  const [qr, setQr] = useState<GoodStandingQR | null>(null)
  const [showQr, setShowQr] = useState(false)

  const generate = useGenerateQrPass((data) => {
    setQr(data)
    setShowQr(true)
  })

  const handleGenerate = () => {
    if (qr) {
      setShowQr((open) => !open)
      return
    }
    generate.mutate(householdId)
  }

  return (
    <div className="rounded-md border border-dashed p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <BadgeCheck className="h-4 w-4" />
          Good Standing Pass
        </p>
        {qr ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => generate.mutate(householdId)}
            disabled={generate.isPending}
          >
            <RefreshCcw className="h-4 w-4" />
            Regenerate
          </Button>
        ) : null}
      </div>

      {generate.isPending && !qr ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating pass…
        </div>
      ) : generate.isError && !qr ? (
        <div className="space-y-3 py-4">
          <p className="text-sm text-muted-foreground">
            {apiErrorMessage(generate.error, 'Could not generate your pass.')}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => generate.mutate(householdId)}
            disabled={generate.isPending}
          >
            <RefreshCcw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      ) : (
        <div className="mt-3">
          {!showQr ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <QrCode className="h-8 w-8 text-muted-foreground" />
              {qr ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowQr(true)}
                >
                  View my pass
                </Button>
              ) : (
                <Button type="button" size="sm" onClick={handleGenerate}>
                  <QrCode className="h-4 w-4" />
                  Generate QR
                </Button>
              )}
              <p className="text-center text-xs text-muted-foreground">
                Generate a Good Standing pass to present at the gate.
              </p>
            </div>
          ) : qr ? (
            <div className="flex flex-col items-center gap-3">
              <QRCodeSVG
                value={passUrl(qr.token)}
                size={140}
                level="M"
                includeMargin={false}
              />
              <div className="flex items-center gap-2">
                <StatusBadge status={qr.standing} />
                <span className="text-xs text-muted-foreground">
                  Valid until {formatDateTime(qr.expiresAt)}
                </span>
              </div>
              <p className="max-w-full break-all rounded bg-muted px-2 py-1 text-center font-mono text-[10px] text-muted-foreground">
                {qr.token}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowQr(false)}
              >
                Hide pass
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Scanning this with your phone camera opens a page confirming
                your household is in good standing.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
