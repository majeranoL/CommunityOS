import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  Puzzle,
  ShieldCheck,
  Trash2,
  Ban,
  Plus,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useAdminCommunity,
  useDeleteCommunity,
  useExemptions,
  useGrantExemption,
  useRevokeExemption,
  useUpdateCommunityStatus,
} from '@/features/admin/hooks/use-admin'
import { formatCurrency, formatDate, initials } from '@/lib/format'
import { useQuery } from '@tanstack/react-query'
import { featuresService } from '@/features/admin/services/features'

export default function AdminCommunityDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: community, isLoading } = useAdminCommunity(id)
  const updateStatus = useUpdateCommunityStatus()
  const remove = useDeleteCommunity()
  const { data: communityFeatures } = useQuery({
    queryKey: ['admin', 'features', 'community', id],
    queryFn: () => featuresService.listByCommunity(id),
    enabled: Boolean(id),
  })
  const { data: exemptions } = useExemptions(id)
  const grantExemption = useGrantExemption(id)
  const revokeExemption = useRevokeExemption(id)
  const [showExemptionDialog, setShowExemptionDialog] = useState(false)
  const [exemptionReason, setExemptionReason] = useState('')
  const [exemptionStart, setExemptionStart] = useState('')
  const [exemptionEnd, setExemptionEnd] = useState('')

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
      <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    )
  }

  if (!community) {
    return <EmptyState icon={Building2} title="Community not found" description="This community may have been deleted." />
  }

  const users = community.users ?? []
  const isActive = community.status === 'ACTIVE'

  return (
    <div className="space-y-6">
      <PageHeader
        title={community.displayName}
        description={`${community.code} · ${community.slug}`}
      >
        <Button variant="outline" onClick={() => navigate('/admin/communities')}>
          <ArrowLeft className="h-4 w-4" />
          Back to communities
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            updateStatus.mutate({
              id,
              status: isActive ? 'INACTIVE' : 'ACTIVE',
            })
          }
          disabled={updateStatus.isPending}
        >
          {isActive ? 'Deactivate' : 'Activate'}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this community?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently disables {community.displayName} and hides it from the platform. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  remove.mutate(id, { onSuccess: () => navigate('/admin/communities') })
                }}
              >
                Delete community
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Email:</span>
              <span className="truncate">{community.email ?? '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Contact:</span>
              <span>{community.contactNumber ?? '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Address:</span>
              <span>{community.address ?? '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Created:</span>
              <span>{formatDate(community.createdAt)}</span>
            </div>
            <p className="border-t pt-3 text-muted-foreground">
              {community.description ?? 'No description provided.'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {community.subscription ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{community.subscription.plan?.name ?? 'No plan'}</span>
                  <div className="flex items-center gap-2">
                    {community.subscription.plan?.tier === 'CUSTOM' && (
                      <Badge variant="warning">Custom</Badge>
                    )}
                    <StatusBadge status={community.subscription.status} />
                  </div>
                </div>
                {community.subscription.plan && (
                  <p className="text-muted-foreground">
                    {formatCurrency(community.subscription.plan.price)}/
                    {community.subscription.plan.billingCycle === 'YEARLY' ? 'yr' : 'mo'}
                  </p>
                )}
                <p className="text-muted-foreground">
                  {formatDate(community.subscription.startsAt)} — {formatDate(community.subscription.endsAt)}
                </p>
                {community.subscription.trialEndsAt && (
                  <Badge variant="secondary">Trial ends {formatDate(community.subscription.trialEndsAt)}</Badge>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">No subscription on record.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ban className="h-4 w-4" />
              Billing Exemptions
            </CardTitle>
            <CardDescription>Communities with active exemptions skip billing sweep.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {exemptions?.length ? (
              <ul className="space-y-3">
                {exemptions.map((ex) => {
                  const isActive =
                    new Date(ex.startDate) <= new Date() &&
                    (!ex.endDate || new Date(ex.endDate) >= new Date())
                  return (
                    <li key={ex.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{ex.reason}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(ex.startDate)}
                            {ex.endDate ? ` — ${formatDate(ex.endDate)}` : ' — Ongoing'}
                          </p>
                          {ex.grantedBy && (
                            <p className="text-xs text-muted-foreground">
                              Granted by {ex.grantedBy.firstName} {ex.grantedBy.lastName}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={isActive ? 'success' : 'muted'}>
                            {isActive ? 'Active' : 'Expired'}
                          </Badge>
                          {isActive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => revokeExemption.mutate(ex.id)}
                              disabled={revokeExemption.isPending}
                            >
                              Revoke
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No exemptions granted.</p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setExemptionReason('')
                setExemptionStart('')
                setExemptionEnd('')
                setShowExemptionDialog(true)
              }}
            >
              <Plus className="h-4 w-4" />
              Grant exemption
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-4 text-center">
              <p className="text-2xl font-semibold">{community._count?.users ?? 0}</p>
              <p className="text-xs text-muted-foreground">Users</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-2xl font-semibold">{community._count?.residents ?? 0}</p>
              <p className="text-xs text-muted-foreground">Residents</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-2xl font-semibold">{community._count?.households ?? 0}</p>
              <p className="text-xs text-muted-foreground">Households</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-2xl font-semibold">{community._count?.facilities ?? 0}</p>
              <p className="text-xs text-muted-foreground">Facilities</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>First 20 user accounts in this community.</CardDescription>
        </CardHeader>
        <CardContent>
          {users.length ? (
            <ul className="divide-y">
              {users.map((user) => (
                <li key={user.id} className="flex items-center gap-3 py-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{initials(user.firstName, user.lastName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {user.firstName} {user.lastName}
                      {user.isPlatformAdmin && (
                        <ShieldCheck className="ml-1 inline h-3.5 w-3.5 text-primary" />
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{user.account.email}</p>
                  </div>
                  <StatusBadge status={user.status} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No users" description="This community has no user accounts yet." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
          <CardDescription>Features assigned to this community.</CardDescription>
        </CardHeader>
        <CardContent>
          {communityFeatures?.length ? (
            <ul className="divide-y">
              {communityFeatures.map((cf) => (
                <li key={cf.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Puzzle className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{cf.feature?.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{cf.feature?.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={cf.feature?.type === 'OPTIONAL' ? 'warning' : 'secondary'}>
                      {cf.feature?.type === 'OPTIONAL' ? 'Optional' : 'Standard'}
                    </Badge>
                    <Badge variant={cf.enabled ? 'success' : 'muted'}>
                      {cf.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Puzzle}
              title="No features assigned"
              description="Assign features from the Features catalog."
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={showExemptionDialog} onOpenChange={setShowExemptionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant billing exemption</DialogTitle>
            <DialogDescription>
              This community will be skipped during billing sweep. Invoices generated during the
              exemption period will be marked as WAIVED.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason</label>
              <Textarea
                placeholder="e.g. Waived for founding community"
                value={exemptionReason}
                onChange={(e) => setExemptionReason(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start date</label>
                <Input
                  type="date"
                  value={exemptionStart}
                  onChange={(e) => setExemptionStart(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">End date (optional)</label>
                <Input
                  type="date"
                  value={exemptionEnd}
                  onChange={(e) => setExemptionEnd(e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">Leave empty for indefinite.</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExemptionDialog(false)}>
              Cancel
            </Button>
            <Button
              disabled={!exemptionReason || !exemptionStart || grantExemption.isPending}
              onClick={() =>
                grantExemption.mutate(
                  {
                    reason: exemptionReason,
                    startDate: exemptionStart,
                    endDate: exemptionEnd || undefined,
                  },
                  { onSuccess: () => setShowExemptionDialog(false) },
                )
              }
            >
              Grant exemption
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
