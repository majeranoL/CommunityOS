import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { BadgeCheck, Loader2, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/status-badge'
import { useGenerateQrPass } from '@/features/good-standing/hooks/use-good-standing'
import type { GoodStandingQR } from '@/features/good-standing/types/good-standing'
import { formatDateTime } from '@/lib/format'

export function GoodStandingPassCard({ householdId }: { householdId: string }) {
  const [qr, setQr] = useState<GoodStandingQR | null>(null)

  const generate = useGenerateQrPass((data) => setQr(data))

  useEffect(() => {
    if (householdId) {
      generate.mutate(householdId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId])

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
        <p className="py-4 text-sm text-muted-foreground">
          Could not generate your pass. Try again in a moment.
        </p>
      ) : qr ? (
        <div className="mt-3 flex flex-col items-center gap-3">
          <QRCodeSVG
            value={qr.token}
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
          <p className="text-center text-xs text-muted-foreground">
            Show this pass at the gate for verification.
          </p>
        </div>
      ) : null}
    </div>
  )
}
