import { useState } from 'react'
import { Home, Search } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuthStore } from '@/store/auth-store'
import { useHouseholdSearch, useMyAcquisitionRequests, useRequestHousehold } from '@/features/households/hooks/use-households'

function label(item: { block?: string | null; lot?: string | null; unit?: string | null; address?: string | null }) {
  return [item.block && `Block ${item.block}`, item.lot && `Lot ${item.lot}`, item.unit && `Unit ${item.unit}`, item.address].filter(Boolean).join(' · ') || 'Unnamed household'
}

export default function MyHouseholdsPage() {
  const user = useAuthStore((state) => state.user)
  const households = user?.resident?.households ?? []
  const { data: requests = [] } = useMyAcquisitionRequests()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [newProperty, setNewProperty] = useState(false)
  const [block, setBlock] = useState('')
  const [lot, setLot] = useState('')
  const [unit, setUnit] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const results = useHouseholdSearch(search)
  const request = useRequestHousehold(() => {
    setSearch('')
    setSelectedId(undefined)
    setNewProperty(false)
    setBlock('')
    setLot('')
    setUnit('')
    setAddress('')
    setNotes('')
  })

  return <div className="space-y-6">
    <PageHeader title="My households" description="Manage your verified properties. Each household keeps separate finances and records." />
    <div className="grid gap-4 md:grid-cols-2">
      {households.map((household) => <Card key={household.id}><CardContent className="flex items-center gap-3 p-4"><Home className="h-5 w-5 text-muted-foreground" /><div className="min-w-0 flex-1"><p className="font-medium">{label(household)}</p><p className="text-xs text-muted-foreground">{household.isPrimary ? 'Primary household' : 'Associated household'}</p></div><StatusBadge status="ACTIVE" /></CardContent></Card>)}
      {!households.length ? <Card><CardContent className="p-6 text-sm text-muted-foreground">No verified household is linked to this account yet.</CardContent></Card> : null}
    </div>
    <Card><CardHeader><CardTitle>Request to add a household</CardTitle><CardDescription>Choose an existing property or submit details for a newly acquired property. An HOA officer must verify it.</CardDescription></CardHeader><CardContent className="space-y-4">
      <div className="flex flex-wrap gap-2"><Input value={search} onChange={(event) => { setSearch(event.target.value); setNewProperty(false) }} placeholder="Search block, lot, unit, or address" /><Button variant="outline" disabled={search.trim().length < 2}><Search className="mr-2 h-4 w-4" />Search</Button><Button variant="outline" onClick={() => { setNewProperty(true); setSelectedId(undefined) }}>New property</Button></div>
      {results.data?.length ? <div className="grid gap-2">{results.data.map((item) => <button key={item.id} type="button" className={`rounded-md border p-3 text-left text-sm ${selectedId === item.id ? 'border-primary bg-primary/5' : ''}`} onClick={() => { setSelectedId(item.id); setNewProperty(false) }}>{label(item)}</button>)}</div> : null}
      {newProperty ? <div className="grid gap-3 sm:grid-cols-2"><div><Label>Block</Label><Input value={block} onChange={(event) => setBlock(event.target.value)} /></div><div><Label>Lot</Label><Input value={lot} onChange={(event) => setLot(event.target.value)} /></div><div><Label>Unit</Label><Input value={unit} onChange={(event) => setUnit(event.target.value)} /></div><div><Label>Address</Label><Input value={address} onChange={(event) => setAddress(event.target.value)} /></div></div> : null}
      <div><Label>Notes</Label><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ownership or occupancy details for the HOA officer" /></div>
      <Button disabled={request.isPending || (!selectedId && !newProperty)} onClick={() => request.mutate({ householdId: selectedId, requestedBlock: block || undefined, requestedLot: lot || undefined, requestedUnit: unit || undefined, requestedAddress: address || undefined, notes: notes || undefined })}>{request.isPending ? 'Submitting…' : 'Submit for review'}</Button>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>My pending requests</CardTitle></CardHeader><CardContent className="space-y-2">{requests.map((item) => <div key={item.id} className="flex items-center justify-between rounded-md border p-3 text-sm"><span>{item.household ? label(item.household) : label({ block: item.requestedBlock, lot: item.requestedLot, unit: item.requestedUnit, address: item.requestedAddress })}</span><StatusBadge status={item.status} /></div>)}{!requests.length ? <p className="text-sm text-muted-foreground">No household requests.</p> : null}</CardContent></Card>
  </div>
}
