import { Building2, CreditCard, DollarSign, Sparkles, Users, UserPlus, CheckCircle2 } from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/page-header'
import { KpiCard } from '@/features/dashboard/components/kpi-card'
import { useAdminAnalytics, useAdminOverview } from '@/features/admin/hooks/use-admin'
import { formatCurrency, toTitleCase } from '@/lib/format'

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#a855f7', '#64748b']

export default function AdminOverviewPage() {
  const { data, isLoading } = useAdminOverview()
  const analytics = useAdminAnalytics()

  const subscriptionData = analytics.data?.subscriptionStatus ?? []
  const hasSubscriptionData = subscriptionData.some((row) => row.count > 0)

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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Platform growth</CardTitle>
            <CardDescription>New communities and users per month, last 12 months.</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={288}>
                <AreaChart data={analytics.data?.growth ?? []} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="growCommunities" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="growUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="communities"
                    name="Communities"
                    stroke="#6366f1"
                    fill="url(#growCommunities)"
                  />
                  <Area
                    type="monotone"
                    dataKey="users"
                    name="Users"
                    stroke="#10b981"
                    fill="url(#growUsers)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription status</CardTitle>
            <CardDescription>Current distribution across all communities.</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : hasSubscriptionData ? (
              <ResponsiveContainer width="100%" height={288}>
                <PieChart>
                  <Pie
                    data={subscriptionData}
                    dataKey="count"
                    nameKey="status"
                    innerRadius={60}
                    outerRadius={96}
                    paddingAngle={2}
                  >
                    {subscriptionData.map((entry, index) => (
                      <Cell key={entry.status} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}`, 'Count']} />
                  <Legend
                    formatter={(value: string) => toTitleCase(value.replaceAll('_', ' ').toLowerCase())}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">No subscriptions yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
