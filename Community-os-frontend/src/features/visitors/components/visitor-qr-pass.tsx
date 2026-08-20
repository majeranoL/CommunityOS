import { QRCodeSVG } from 'qrcode.react'
import { Badge } from '@/components/ui/badge'
import type { VisitorListItem } from '@/features/visitors/types/visitor'
import { formatDateTime } from '@/lib/format'

interface QRCodePassProps {
  visitor: VisitorListItem
}

export function QRCodePass({ visitor }: QRCodePassProps) {
  const qrData = JSON.stringify({
    id: visitor.id,
    name: visitor.name,
    host: visitor.hostResident
      ? `${visitor.hostResident.firstName} ${visitor.hostResident.lastName}`
      : undefined,
    plate: visitor.vehicle?.plateNumber,
    purpose: visitor.purpose,
    entry: visitor.entryAt,
  })

  return (
    <div className="flex flex-col items-center gap-3 rounded-md border p-4">
      <p className="text-xs font-medium text-muted-foreground">Visitor Pass</p>
      <QRCodeSVG
        value={qrData}
        size={140}
        level="M"
        includeMargin={false}
      />
      <div className="text-center text-xs text-muted-foreground">
        <p className="font-medium text-foreground">{visitor.name}</p>
        {visitor.hostResident ? (
          <p>Host: {visitor.hostResident.firstName} {visitor.hostResident.lastName}</p>
        ) : null}
        {visitor.vehicle ? (
          <Badge variant="outline" className="mt-1 text-[10px]">{visitor.vehicle.plateNumber}</Badge>
        ) : null}
        {visitor.entryAt ? (
          <p className="mt-1">{formatDateTime(visitor.entryAt)}</p>
        ) : null}
      </div>
    </div>
  )
}
