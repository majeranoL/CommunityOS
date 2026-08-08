import { useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  BadgeDollarSign,
  PiggyBank,
  ReceiptText,
  TrendingDown,
  type LucideIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { formatCurrency, toTitleCase } from '@/lib/format'
import {
  useFinancialAnalytics,
  useStatusBreakdown,
  useTrends,
} from '@/features/analytics/hooks/use-analytics'
import type { StatusBreakdownEntity } from '@/features/analytics/types/analytics'

const BREAKDOWN_ENTITIES: StatusBreakdownEntity[] = [
  'assessments',
  'payments',
  'complaints',
  'maintenance',
  'reservations',
  'visitors',
  'vehicles',
  'staff',
  'facilities',
  'events',
]

const TREND_MONTHS = [6, 12, 24]

const DONUT_COLORS = [
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#f43f5e',
  '#06b6d4',
  '#a855f7',
  '#84cc16',
  '#ef4444',
  '#14b8a6',
  '#f97316',
  '#0ea5e9',
  '#64748b',
]

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  loading,
}: {
  label: string
  value?: string
  hint?: string
  icon: LucideIcon
  tone: string
  loading?: boolean
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-semibold tracking-tight">{value ?? '—'}</p>
            )}
            {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
          </div>
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', tone)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ChartSkeleton() {
  return <Skeleton className="h-[280px] w-full" />
}

export default function AnalyticsPage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [trendMonths, setTrendMonths] = useState(6)
  const [entity, setEntity] = useState<StatusBreakdownEntity>('assessments')

  const { data: financial, isLoading: financialLoading } = useFinancialAnalytics(month)
  const { data: trends, isLoading: trendsLoading } = useTrends(trendMonths)
  const { data: breakdown, isLoading: breakdownLoading } = useStatusBreakdown(entity)

  const breakdownData = Object.entries(breakdown?.counts ?? {}).map(([name, value]) => ({
    name,
    value,
  }))

  const totalBreakdownCount = breakdownData.reduce((sum, entry) => sum + entry.value, 0)

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Community performance at a glance." />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <label htmlFor="month" className="text-sm text-muted-foreground">
            Period
          </label>
          <Input
            id="month"
            type="month"
            className="w-44"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {financial?.overall.assessmentsCount ?? '—'} active assessments
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total billed"
          value={formatCurrency(financial?.overall.totalBilled)}
          hint="All non-cancelled assessments"
          icon={ReceiptText}
          tone="bg-primary/10 text-primary"
          loading={financialLoading}
        />
        <StatCard
          label="Collected"
          value={formatCurrency(financial?.overall.totalCollected)}
          hint="Payments against assessments"
          icon={PiggyBank}
          tone="bg-emerald-500/10 text-emerald-600"
          loading={financialLoading}
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(financial?.overall.outstanding)}
          hint="Billed minus collected"
          icon={TrendingDown}
          tone="bg-amber-500/10 text-amber-600"
          loading={financialLoading}
        />
        <StatCard
          label="Collection rate"
          value={financial?.overall.collectionRate !== undefined ? `${financial.overall.collectionRate}%` : undefined}
          hint={`${financial?.period.billedCount ?? 0} billed / ${financial?.period.collectedCount ?? 0} collected this period`}
          icon={BadgeDollarSign}
          tone="bg-sky-500/10 text-sky-600"
          loading={financialLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Revenue trends</CardTitle>
              <CardDescription>Billed vs collected over time.</CardDescription>
            </div>
            <Select
              value={String(trendMonths)}
              onValueChange={(value) => setTrendMonths(Number(value))}
            >
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Months" />
              </SelectTrigger>
              <SelectContent>
                {TREND_MONTHS.map((count) => (
                  <SelectItem key={count} value={String(count)}>
                    {count} months
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={trends ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillBilled" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="fillCollected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} width={56} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="billed"
                    name="Billed"
                    stroke="#6366f1"
                    fill="url(#fillBilled)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="collected"
                    name="Collected"
                    stroke="#10b981"
                    fill="url(#fillCollected)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity trends</CardTitle>
            <CardDescription>New complaints and maintenance requests.</CardDescription>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trends ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} width={32} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="complaints"
                    name="Complaints"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="maintenance"
                    name="Maintenance"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Status breakdown</CardTitle>
            <CardDescription>Records by status for the selected module.</CardDescription>
          </div>
          <Select value={entity} onValueChange={(value) => setEntity(value as StatusBreakdownEntity)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Module" />
            </SelectTrigger>
            <SelectContent>
              {BREAKDOWN_ENTITIES.map((item) => (
                <SelectItem key={item} value={item}>
                  {toTitleCase(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {breakdownLoading ? (
            <ChartSkeleton />
          ) : totalBreakdownCount === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Activity className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No records yet for {toTitleCase(entity)}.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <ResponsiveContainer width="100%" height={260} className="sm:max-w-[340px]">
                <PieChart>
                  <Pie
                    data={breakdownData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {breakdownData.map((entry, index) => (
                      <Cell key={entry.name} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <ul className="grid w-full gap-2 sm:max-w-sm">
                {breakdownData
                  .filter((entry) => entry.value > 0)
                  .map((entry, index) => (
                    <li key={entry.name} className="flex items-center gap-3 text-sm">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
                      />
                      <span className="font-medium capitalize">{toTitleCase(entry.name)}</span>
                      <span className="ml-auto text-muted-foreground">
                        {entry.value} ({Math.round((entry.value / totalBreakdownCount) * 100)}%)
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
