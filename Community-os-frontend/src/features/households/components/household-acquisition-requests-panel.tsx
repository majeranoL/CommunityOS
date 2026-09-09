import { Check, X } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/status-badge'
import { useOfficerAcquisitionRequests, useReviewHouseholdRequest } from '@/features/households/hooks/use-households'

function label(item: { block?: string | null; lot?: string | null; unit?: string | null; address?: string | null }) {
  return [item.block && `Block ${item.block}`, item.lot && `Lot ${item.lot}`, item.unit && `Unit ${item.unit}`, item.address].filter(Boolean).join(' · ') || 'New property details'
}

export function HouseholdAcquisitionRequestsPanel() {
  const { data: requests = [] } = useOfficerAcquisitionRequests()
  const review = useReviewHouseholdRequest()
  const pending = requests.filter((request) => request.status === 'PENDING')
  if (!pending.length) return null
  return <Card><CardHeader><CardTitle>Household requests</CardTitle><CardDescription>Verify property ownership or occupancy before assigning access.</CardDescription></CardHeader><CardContent className="space-y-2">{pending.map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"><div className="text-sm"><p className="font-medium">{request.requestedBy ? `${request.requestedBy.firstName} ${request.requestedBy.lastName}` : 'Resident'} · {request.household ? label(request.household) : label({ block: request.requestedBlock, lot: request.requestedLot, unit: request.requestedUnit, address: request.requestedAddress })}</p><p className="text-xs text-muted-foreground">{request.notes || 'No notes provided'}</p></div><div className="flex gap-2"><StatusBadge status={request.status} /><Button size="sm" onClick={() => review.mutate({ id: request.id, status: 'APPROVED' })}><Check className="mr-1 h-4 w-4" />Approve</Button><Button size="sm" variant="destructive" onClick={() => review.mutate({ id: request.id, status: 'REJECTED', reviewNotes: 'Request could not be verified.' })}><X className="mr-1 h-4 w-4" />Reject</Button></div></div>)}</CardContent></Card>
}
