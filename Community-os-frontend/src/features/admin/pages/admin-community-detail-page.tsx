import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  useAdminCommunity,
  useDeleteCommunity,
  useUpdateCommunityStatus,
} from '@/features/admin/hooks/use-admin'
import { formatCurrency, formatDate, initials } from '@/lib/format'

export default function AdminCommunityDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: community, isLoading } = useAdminCommunity(id)
  const updateStatus = useUpdateCommunityStatus()
  const remove = useDeleteCommunity()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
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
                  <StatusBadge status={community.subscription.status} />
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
    </div>
  )
}
