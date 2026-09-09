import { useState } from 'react'
import { Building2, CheckCircle2, FileText, Loader2, Plus, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthStore, useHasPermission } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import { documentsService } from '@/features/documents/services/documents'
import { formatCurrency, formatDate } from '@/lib/format'
import {
  useCancelConstructionRequest,
  useCloseConstructionRequest,
  useCompleteConstructionRequest,
  useConstructionRequirements,
  useCreateConstructionRequirement,
  useConstructionRequests,
  useCreateConstructionRequest,
  useResolveConstructionBond,
  useReviewConstructionRequest,
} from '@/features/construction/hooks/use-construction'
import type { ConstructionDocumentInput, ConstructionRequest } from '@/features/construction/types/construction'

export default function ConstructionPage() {
  const user = useAuthStore((state) => state.user)
  const canCreate = useHasPermission(PERMISSIONS.constructionCreate)
  const canReview = useHasPermission(PERMISSIONS.constructionReview)
  const canComplete = useHasPermission(PERMISSIONS.constructionComplete)
  const canClose = useHasPermission(PERMISSIONS.constructionClose)
  const canBond = useHasPermission(PERMISSIONS.constructionBond)
  const canRequirements = useHasPermission(PERMISSIONS.constructionRequirements)
  const householdId = user?.resident?.household?.id ?? ''
  const [formOpen, setFormOpen] = useState(false)
  const [selected, setSelected] = useState<ConstructionRequest | null>(null)
  const { data: requests = [], isLoading } = useConstructionRequests()
  const { data: requirements = [] } = useConstructionRequirements()
  const review = useReviewConstructionRequest()
  const complete = useCompleteConstructionRequest()
  const close = useCloseConstructionRequest()
  const cancel = useCancelConstructionRequest()
  const resolveBond = useResolveConstructionBond()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Construction and renovation"
        description="Submit and track household construction requests and bonds."
      >
        {canCreate ? <Button onClick={() => setFormOpen(true)}><Plus className="mr-2 h-4 w-4" />New request</Button> : undefined}
      </PageHeader>
      {formOpen ? <RequestForm householdId={householdId} requirements={requirements} onClose={() => setFormOpen(false)} /> : null}
      {canRequirements ? <RequirementsPanel requirements={requirements} /> : null}
      <div className="grid gap-4">
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        {requests.map((request) => (
          <Card key={request.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4" />{request.requestNumber} · {request.title}</CardTitle>
                <CardDescription>{request.type} · {request.household.block ?? ''} {request.household.lot ?? ''} · {formatDate(request.plannedStartDate)} to {formatDate(request.plannedEndDate)}</CardDescription>
              </div>
              <StatusBadge status={request.status} />
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{request.description}</p>
              {Number(request.bondAmount) > 0 ? <p className="text-sm">Bond: <strong>{formatCurrency(request.bondAmount)}</strong> {request.bond ? `(${request.bond.status})` : '(created after approval)'}</p> : null}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelected(request)}>Details</Button>
                {canReview && request.status === 'SUBMITTED' ? <><Button size="sm" onClick={() => review.mutate({ id: request.id, status: 'APPROVED' })}><CheckCircle2 className="mr-1 h-4 w-4" />Approve</Button><Button variant="destructive" size="sm" onClick={() => review.mutate({ id: request.id, status: 'REJECTED', notes: 'Rejected by reviewer.' })}><XCircle className="mr-1 h-4 w-4" />Reject</Button></> : null}
                {canComplete && request.status === 'APPROVED' ? <Button size="sm" onClick={() => complete.mutate(request.id)}>Mark completed</Button> : null}
                {canClose && request.status === 'COMPLETED' ? <Button size="sm" onClick={() => close.mutate(request.id)}>Close</Button> : null}
                {canBond && request.bond && ['OPEN', 'ACTIVE'].includes(request.bond.status) ? <><Button variant="outline" size="sm" onClick={() => resolveBond.mutate({ id: request.bond!.id, status: 'REFUNDED', notes: 'Bond refunded after completion.' })}>Refund bond</Button><Button variant="destructive" size="sm" onClick={() => resolveBond.mutate({ id: request.bond!.id, status: 'FORFEITED', notes: 'Bond forfeited by officer decision.' })}>Forfeit bond</Button></> : null}
                {request.status === 'SUBMITTED' && !canReview ? <Button variant="ghost" size="sm" onClick={() => cancel.mutate(request.id)}>Cancel</Button> : null}
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && requests.length === 0 ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No construction requests yet.</CardContent></Card> : null}
      </div>
      {selected ? <Card><CardHeader><CardTitle>Request details</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p><strong>{selected.requestNumber}</strong> {selected.title}</p><p>{selected.description}</p><p>Documents: {selected.documents.length}</p><Button variant="outline" onClick={() => setSelected(null)}>Close details</Button></CardContent></Card> : null}
    </div>
  )
}

function RequestForm({ householdId, requirements, onClose }: { householdId: string; requirements: Array<{ id: string; name: string; isRequired: boolean }>; onClose: () => void }) {
  const create = useCreateConstructionRequest()
  const [type, setType] = useState<'CONSTRUCTION' | 'RENOVATION'>('RENOVATION')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [bond, setBond] = useState('0')
  const [location, setLocation] = useState('')
  const [contractorName, setContractorName] = useState('')
  const [documents, setDocuments] = useState<ConstructionDocumentInput[]>([])
  const addDocument = async (requirementId: string | undefined, file: File) => {
    const uploaded = await documentsService.upload(file)
    setDocuments((current) => [...current, { requirementId, documentType: requirementId ? (requirements.find((item) => item.id === requirementId)?.name ?? 'Document') : 'Supporting document', originalName: uploaded.originalName, fileId: uploaded.id, fileUrl: uploaded.url }])
  }
  const submit = () => create.mutate({ householdId, type, title, description, location, contractorName, plannedStartDate: new Date(start).toISOString(), plannedEndDate: new Date(end).toISOString(), bondAmount: Number(bond), documents }, { onSuccess: onClose })
  return <Card><CardHeader><CardTitle>New construction request</CardTitle><CardDescription>Required documents must be uploaded before submission.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
    <div className="grid gap-2"><Label>Type</Label><Select value={type} onValueChange={(value) => setType(value as typeof type)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="CONSTRUCTION">Construction</SelectItem><SelectItem value="RENOVATION">Renovation</SelectItem></SelectContent></Select></div>
    <div className="grid gap-2"><Label>Title</Label><Input value={title} onChange={(event) => setTitle(event.target.value)} /></div>
    <div className="grid gap-2"><Label>Location</Label><Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Unit or work area" /></div>
    <div className="grid gap-2"><Label>Contractor</Label><Input value={contractorName} onChange={(event) => setContractorName(event.target.value)} /></div>
    <div className="grid gap-2 sm:col-span-2"><Label>Description</Label><Textarea value={description} onChange={(event) => setDescription(event.target.value)} /></div>
    <div className="grid gap-2"><Label>Planned start</Label><Input type="date" value={start} onChange={(event) => setStart(event.target.value)} /></div>
    <div className="grid gap-2"><Label>Planned end</Label><Input type="date" value={end} onChange={(event) => setEnd(event.target.value)} /></div>
    <div className="grid gap-2"><Label>Requested bond</Label><Input type="number" min="0" value={bond} onChange={(event) => setBond(event.target.value)} /></div>
    <div className="space-y-2 sm:col-span-2"><Label>Documents</Label>{requirements.map((requirement) => <label key={requirement.id} className="flex items-center justify-between rounded-md border p-2 text-sm"><span><FileText className="mr-2 inline h-4 w-4" />{requirement.name}{requirement.isRequired ? ' *' : ''}</span><Input type="file" className="max-w-xs" onChange={(event) => { const file = event.target.files?.[0]; if (file) void addDocument(requirement.id, file) }} /></label>)}{documents.map((document) => <p key={document.originalName} className="text-xs text-muted-foreground">Uploaded: {document.originalName}</p>)}</div>
    <div className="flex gap-2 sm:col-span-2"><Button onClick={submit} disabled={create.isPending || !householdId}>{create.isPending ? 'Submitting…' : 'Submit request'}</Button><Button variant="outline" onClick={onClose}><XCircle className="mr-2 h-4 w-4" />Cancel</Button></div>
  </CardContent></Card>
}

function RequirementsPanel({ requirements }: { requirements: Array<{ id: string; name: string; isRequired: boolean }> }) {
  const create = useCreateConstructionRequirement()
  const [name, setName] = useState('')
  const [required, setRequired] = useState(true)
  return <Card><CardHeader><CardTitle>Required documents</CardTitle><CardDescription>Configure the documents residents must submit with a request.</CardDescription></CardHeader><CardContent className="space-y-3"><div className="flex flex-wrap gap-2">{requirements.map((requirement) => <span key={requirement.id} className="rounded-md border px-2 py-1 text-sm">{requirement.name}{requirement.isRequired ? ' *' : ''}</span>)}</div><div className="flex flex-wrap gap-2"><Input className="max-w-sm" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Building permit" /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} /> Required</label><Button disabled={!name.trim() || create.isPending} onClick={() => create.mutate({ name: name.trim(), isRequired: required }, { onSuccess: () => setName('') })}>Add requirement</Button></div></CardContent></Card>
}
