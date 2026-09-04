import { Banknote, DollarSign, TrendingDown, TrendingUp } from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/page-header'
import { KpiCard } from '@/features/dashboard/components/kpi-card'
import { useAdminRevenue } from '@/features/admin/hooks/use-admin'
import { formatCurrency } from '@/lib/format'

export default function AdminRevenuePage() {
  const { data, isLoading } = useAdminRevenue()

  const monthOverMonth =
    data && data.lastMonth > 0
      ? ((data.thisMonth - data.lastMonth) / data.lastMonth) * 100
      : null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue"
        description="Platform-wide subscription revenue and collections."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total collected"
          value={Number(data?.totalCollected ?? 0)}
          icon={DollarSign}
          hint="All time"
          loading={isLoading}
        />
        <KpiCard
          label="Outstanding"
          value={Number(data?.outstanding ?? 0)}
          icon={Banknote}
          hint="Unpaid invoices"
          loading={isLoading}
        />
        <KpiCard
          label="This month"
          value={Number(data?.thisMonth ?? 0)}
          icon={TrendingUp}
          hint={
            monthOverMonth !== null
              ? `${monthOverMonth >= 0 ? '+' : ''}${monthOverMonth.toFixed(1)}% vs last month`
              : 'No prior month data'
          }
          loading={isLoading}
        />
        <KpiCard
          label="MRR"
          value={Number(data?.mrr ?? 0)}
          icon={TrendingDown}
          hint="Monthly recurring revenue"
          loading={isLoading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue by month</CardTitle>
            <CardDescription>Collections over the last 12 months.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={288}>
                <AreaChart
                  data={data?.revenueByMonth ?? []}
                  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip formatter={(value) => [formatCurrency(value as number), 'Collected']} />
                  <Area
                    type="monotone"
                    dataKey="collected"
                    name="Collected"
                    stroke="#10b981"
                    fill="url(#revGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top communities</CardTitle>
            <CardDescription>Highest earning tenants.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : data?.topCommunities.length ? (
              <div className="space-y-3">
                {data.topCommunities.map((community, index) => (
                  <div
                    key={community.communityId}
                    className="flex items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                          {index + 1}
                        </span>
                        <p className="truncate text-sm font-medium">{community.communityName}</p>
                      </div>
                      <p className="ml-7 text-xs text-muted-foreground">
                        {community.invoiceCount} invoice{community.invoiceCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium">
                      {formatCurrency(community.totalCollected)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No revenue data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
