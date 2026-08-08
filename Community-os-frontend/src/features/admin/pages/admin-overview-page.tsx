import { Building2, CreditCard, DollarSign, Sparkles, Users, UserPlus, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/page-header'
import { KpiCard } from '@/features/dashboard/components/kpi-card'
import { useAdminOverview } from '@/features/admin/hooks/use-admin'
import { formatCurrency } from '@/lib/format'

export default function AdminOverviewPage() {
  const { data, isLoading } = useAdminOverview()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform overview"
        description="High-level health of all communities on CommunityOS."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Communities" value={data?.totalCommunities} icon={Building2} loading={isLoading} />
        <KpiCard label="Active communities" value={data?.activeCommunities} icon={CheckCircle2} loading={isLoading} />
        <KpiCard label="Total users" value={data?.totalUsers} icon={Users} loading={isLoading} />
        <KpiCard label="Total residents" value={data?.totalResidents} icon={UserPlus} loading={isLoading} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Active subscriptions"
          value={data?.activeSubscriptions}
          icon={CreditCard}
          loading={isLoading}
        />
        <KpiCard
          label="Trial subscriptions"
          value={data?.trialSubscriptions}
          icon={Sparkles}
          loading={isLoading}
        />
        <KpiCard
          label="Signups (30 days)"
          value={data?.recentSignups}
          icon={UserPlus}
          loading={isLoading}
        />
        <KpiCard
          label="Revenue collected"
          value={Number(data?.collectedRevenue ?? 0)}
          icon={DollarSign}
          hint={formatCurrency(data?.collectedRevenue)}
          loading={isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
          <CardDescription>Things to watch across the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <span>
                  <span className="font-medium">{data?.trialSubscriptions ?? 0}</span> communities are on a trial. Convert them before they lapse.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <span className="font-medium">{data?.activeSubscriptions ?? 0}</span> active subscriptions generating recurring revenue.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <DollarSign className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span>
                  Lifetime collected revenue: <span className="font-medium">{formatCurrency(data?.collectedRevenue)}</span>
                </span>
              </li>
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
