import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  FileDown,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Check,
  XCircle,
  RotateCcw,
  Pencil,
  Wallet,
  Receipt,
  BadgeDollarSign,
  Landmark,
  Settings2,
  Gauge,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Pagination } from '@/components/shared/pagination'
import { StatusBadge } from '@/components/shared/status-badge'
import { DataTable, type Column } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useHasPermission } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import { toast } from '@/components/ui/sonner'
import { PaymentMethodsManager } from '@/features/finance/components/payment-methods-manager'
import { paymentMethodsService } from '@/features/finance/services/finance'
import {
  useAssessments,
  usePayments,
  useDeleteAssessment,
  useDeletePayment,
  useVerifyPayment,
  useRefundPayment,
  useIssueAssessment,
  useCancelAssessment,
  useWaiveAssessment,
  useChargeTypes,
  useBillingPeriods,
  useDeleteChargeType,
  useDeleteBillingPeriod,
  useCancelPayment,
  usePayment,
  useExpenses,
  useDeleteExpense,
  useIncomeStatement,
  useUtilityExpenses,
  useUtilityExpenseSummary,
  useDeleteUtilityExpense,
  useFinanceOverview,
  useUtilityConfigs,
  useDeleteUtilityConfig,
  useUtilityReadings,
  useDeleteUtilityReading,
  useGenerateUtilityBills,
} from '@/features/finance/hooks/use-finance'
import { AssessmentFormDialog } from '@/features/finance/components/assessment-form-dialog'
import { AssessmentDetailDialog } from '@/features/finance/components/assessment-detail-dialog'
import { GenerateDuesDialog } from '@/features/finance/components/generate-dues-dialog'
import { DuesMonthsTab } from '@/features/finance/components/dues-months-tab'
import { PaymentFormDialog } from '@/features/finance/components/payment-form-dialog'
import { PaymentDetailDialog } from '@/features/finance/components/payment-detail-dialog'
import { PaymentReceiptDialog } from '@/features/finance/components/payment-receipt-dialog'
import { RejectPaymentDialog } from '@/features/finance/components/reject-payment-dialog'
import { ChargeTypeFormDialog } from '@/features/finance/components/charge-type-form-dialog'
import { BillingPeriodDialog } from '@/features/finance/components/billing-period-dialog'
import { ImportExportPanel } from '@/features/finance/components/import-export-panel'
import { ImportExportDialog } from '@/features/finance/components/import-export-dialog'
import { DuesSettingsDialog } from '@/features/finance/components/dues-settings-dialog'
import { MyDuesTab } from '@/features/finance/components/my-dues-tab'
import { MyPaymentsTab } from '@/features/finance/components/my-payments-tab'
import { useIsFeatureEnabled } from '@/features/features/hooks/use-enabled-features'
import { UtilityRateDialog } from '@/features/finance/components/utility-rate-dialog'
import { UtilityReadingDialog } from '@/features/finance/components/utility-reading-dialog'
import { ExpenseFormDialog } from '@/features/finance/components/expense-form-dialog'
import { UtilityExpenseFormDialog } from '@/features/finance/components/utility-expense-form-dialog'
import { householdLabel } from '@/features/finance/components/household-select'
import type {
  AssessmentListItem,
  AssessmentStatus,
  BillingPeriod,
  ChargeType,
  Expense,
  ExpenseCategory,
  FinanceOverviewRecentIn,
  FinanceOverviewRecentOut,
  IncomeStatement,
  PaymentListItem,
  PaymentStatus,
  UtilityBillingConfig,
  UtilityExpense,
  UtilityReading,
  UtilityType,
} from '@/features/finance/types/finance'
import type { ImportKind } from '@/features/finance/types/finance'
import { EXPENSE_CATEGORIES, UTILITY_TYPES } from '@/features/finance/validation/finance'
import { formatCurrency, formatDate, toTitleCase } from '@/lib/format'

const ASSESSMENT_STATUSES: Array<{ value: AssessmentStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ISSUED', label: 'Issued' },
  { value: 'PARTIALLY_PAID', label: 'Partially paid' },
  { value: 'PAID', label: 'Paid' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'WAIVED', label: 'Waived' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const PAYMENT_STATUSES: Array<{ value: PaymentStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'PENDING_VERIFICATION', label: 'Pending verification' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

function PaymentMethodsConfigTab() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Payment methods"
        description="Configure how residents can pay the association online (GCash / Maya / bank)."
      />
      <PaymentMethodsManager
        service={paymentMethodsService}
        queryKey={['payment-methods', 'admin']}
      />
    </div>
  )
}

export default function FinancePage() {
  const canCreateAssessment = useHasPermission(PERMISSIONS.assessmentCreate)
  const canViewAll = useHasPermission(PERMISSIONS.financeViewAll)
  const canManage = useHasPermission(PERMISSIONS.financeManage)
  const canImport = useHasPermission(PERMISSIONS.financeImport)
  const canExport = useHasPermission(PERMISSIONS.financeExport)
  const canViewExpenses = useHasPermission(PERMISSIONS.financeExpenseView)
  const canViewIncomeStatement = useHasPermission(PERMISSIONS.financeIncomeStatementView)

  const isManager = canCreateAssessment || canManage
  const financeTransparencyEnabled = useIsFeatureEnabled('finance-transparency')
  const showOverview = canViewAll && canManage
  const showMonthlyDues = canCreateAssessment || canViewAll || canManage
  const showOtherCharges = showMonthlyDues
  const showPayments = isManager
  const showChargeTypes = canViewAll || canManage
  const showBillingPeriods = canViewAll || canManage
  const showImportExport = canImport || canExport
  const showExpenses = isManager || (financeTransparencyEnabled && (canViewExpenses || canViewIncomeStatement))
  const showUtilities = isManager || (financeTransparencyEnabled && (canViewExpenses || canViewIncomeStatement))
  const showReports = isManager || (financeTransparencyEnabled && canViewIncomeStatement)
  const showPaymentMethodsConfig = canManage
  const showSettingsMenu =
    (showChargeTypes || showBillingPeriods || showImportExport || showMonthlyDues || showPaymentMethodsConfig) &&
    isManager

  const tabs: Array<{ value: string; label: string }> = []
  if (!isManager) tabs.push({ value: 'my-dues', label: 'My dues' })
  if (!isManager) tabs.push({ value: 'my-payments', label: 'My payments' })
  if (showOverview) tabs.push({ value: 'overview', label: 'Overview' })
  if (showMonthlyDues) tabs.push({ value: 'monthly-dues', label: 'Monthly dues' })
  if (showOtherCharges) tabs.push({ value: 'other-charges', label: 'Other charges' })
  if (showPayments) tabs.push({ value: 'payments', label: 'Payments' })
  if (showExpenses) tabs.push({ value: 'expenses', label: 'Expenses' })
  if (showUtilities) tabs.push({ value: 'utilities', label: 'Utilities' })
  if (showReports) tabs.push({ value: 'reports', label: 'Reports' })

  const [activeTab, setActiveTab] = useState<string | undefined>(undefined)
  const currentTab = activeTab ?? tabs[0]?.value ?? 'payments'

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail
      if (typeof detail === 'string') setActiveTab(detail)
    }
    window.addEventListener('finance:navigate', handler)
    return () => window.removeEventListener('finance:navigate', handler)
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Finance"
          description="Assessments, payments, utilities, and the community ledger."
        />
        {showSettingsMenu ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="mt-1 shrink-0">
                <Settings2 className="h-4 w-4" />
                Finance settings
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {showMonthlyDues ? (
                <DropdownMenuItem onClick={() => setActiveTab('dues-bills-advanced')}>
                  All dues bills (advanced)
                </DropdownMenuItem>
              ) : null}
              {showChargeTypes ? (
                <DropdownMenuItem onClick={() => setActiveTab('charge-types')}>
                  Charge types
                </DropdownMenuItem>
              ) : null}
              {showBillingPeriods ? (
                <DropdownMenuItem onClick={() => setActiveTab('billing-periods')}>
                  Billing periods
                </DropdownMenuItem>
              ) : null}
              {showImportExport ? (
                <DropdownMenuItem onClick={() => setActiveTab('import-export')}>
                  Import / export
                </DropdownMenuItem>
              ) : null}
              {showPaymentMethodsConfig ? (
                <DropdownMenuItem onClick={() => setActiveTab('payment-methods-config')}>
                  Payment methods
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      <Tabs value={currentTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {!isManager ? (
          <TabsContent value="my-dues">
            <MyDuesTab />
          </TabsContent>
        ) : null}
        {!isManager ? (
          <TabsContent value="my-payments">
            <MyPaymentsTab />
          </TabsContent>
        ) : null}
        {showOverview ? (
          <TabsContent value="overview">
            <OverviewTab />
          </TabsContent>
        ) : null}
        {showMonthlyDues ? (
          <TabsContent value="monthly-dues">
            <DuesMonthsTab />
          </TabsContent>
        ) : null}
        {showOtherCharges ? (
          <TabsContent value="other-charges">
            <AssessmentsTab variant="other" />
          </TabsContent>
        ) : null}
        {showPayments ? (
          <TabsContent value="payments">
            <PaymentsTab />
          </TabsContent>
        ) : null}
        {showExpenses ? (
          <TabsContent value="expenses">
            <ExpensesTab />
          </TabsContent>
        ) : null}
        {showUtilities ? (
          <TabsContent value="utilities">
            <UtilitiesTab />
          </TabsContent>
        ) : null}
        {showReports ? (
          <TabsContent value="reports">
            <IncomeStatementTab />
          </TabsContent>
        ) : null}
        {showChargeTypes ? (
          <TabsContent value="charge-types">
            <ChargeTypesTab />
          </TabsContent>
        ) : null}
        {showBillingPeriods ? (
          <TabsContent value="billing-periods">
            <BillingPeriodsTab />
          </TabsContent>
        ) : null}
        {showImportExport ? (
          <TabsContent value="import-export">
            <ImportExportPanel />
          </TabsContent>
        ) : null}
        {showPaymentMethodsConfig ? (
          <TabsContent value="payment-methods-config">
            <PaymentMethodsConfigTab />
          </TabsContent>
        ) : null}
        {showMonthlyDues ? (
          <TabsContent value="dues-bills-advanced" className="mt-0">
            <AssessmentsTab variant="dues" />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  )
}

function OverviewCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'success' | 'destructive'
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={`mt-1 text-xl font-semibold ${
            tone === 'success' ? 'text-success' : tone === 'destructive' ? 'text-destructive' : ''
          }`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

function OverviewTab() {
  const { data, isLoading } = useFinanceOverview()

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Loading finance overview…</p>
  }

  const { summary, recentMoneyIn, recentMoneyOut, needsAttention } = data

  const attentionItems: Array<{ label: string; hint: string; tab: string }> = []
  if (needsAttention.pendingVerificationPayments > 0) {
    attentionItems.push({
      label: `${needsAttention.pendingVerificationPayments} payment${needsAttention.pendingVerificationPayments === 1 ? '' : 's'} waiting for verification`,
      hint: `${formatCurrency(needsAttention.pendingVerificationAmount)} to confirm`,
      tab: 'payments',
    })
  }
  if (needsAttention.householdsWithUnpaidDues > 0) {
    attentionItems.push({
      label: `${needsAttention.householdsWithUnpaidDues} household${needsAttention.householdsWithUnpaidDues === 1 ? '' : 's'} with unpaid dues`,
      hint: 'See monthly dues',
      tab: 'monthly-dues',
    })
  }
  if (needsAttention.overdueAssessments > 0) {
    attentionItems.push({
      label: `${needsAttention.overdueAssessments} overdue charge${needsAttention.overdueAssessments === 1 ? '' : 's'}`,
      hint: 'Follow up or add a late fee',
      tab: 'other-charges',
    })
  }
  if (needsAttention.missingMeterReadings > 0) {
    attentionItems.push({
      label: `${needsAttention.missingMeterReadings} meter reading${needsAttention.missingMeterReadings === 1 ? '' : 's'} still missing this month`,
      hint: 'Record readings in Utilities',
      tab: 'utilities',
    })
  }

  const renderMoneyIn = (row: FinanceOverviewRecentIn) => (
    <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {row.payer ?? (row.household ? householdLabel(row.household) : 'Household')}
        </p>
        <p className="text-xs text-muted-foreground">
          {toTitleCase(String(row.method)).replace('_', ' ')}
          {row.reference ? ` · ${row.reference}` : ''}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-success">+{formatCurrency(row.amount)}</p>
        <p className="text-xs text-muted-foreground">{formatDate(row.date)}</p>
      </div>
    </div>
  )

  const renderMoneyOut = (row: FinanceOverviewRecentOut) => (
    <div key={`${row.kind}-${row.id}`} className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{row.payee ?? toTitleCase(String(row.category))}</p>
        <p className="text-xs text-muted-foreground">{toTitleCase(String(row.category))}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-destructive">−{formatCurrency(row.amount)}</p>
        <p className="text-xs text-muted-foreground">{formatDate(row.date)}</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <OverviewCard label="Collected" value={formatCurrency(summary.collected)} tone="success" />
        <OverviewCard label="Spent on expenses" value={formatCurrency(summary.expenses)} tone="destructive" />
        <OverviewCard label="Available funds" value={formatCurrency(summary.availableFunds)} />
        <OverviewCard label="Billed to households" value={formatCurrency(summary.billed)} />
        <OverviewCard label="Still unpaid" value={formatCurrency(summary.unpaid)} />
      </div>

      {attentionItems.length > 0 ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Needs your attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {attentionItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('finance:navigate', { detail: item.tab }))}
                className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left hover:bg-accent"
              >
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.hint}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowDownRight className="h-4 w-4 text-success" />
              Recent money in
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentMoneyIn.length ? (
              recentMoneyIn.map(renderMoneyIn)
            ) : (
              <p className="text-sm text-muted-foreground">No verified payments yet.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowUpRight className="h-4 w-4 text-destructive" />
              Recent money out
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentMoneyOut.length ? (
              recentMoneyOut.map(renderMoneyOut)
            ) : (
              <p className="text-sm text-muted-foreground">No expenses recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function AssessmentsTab({ variant = 'dues' }: { variant?: 'dues' | 'other' }) {
  const isDues = variant === 'dues'
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<AssessmentStatus | 'ALL'>('ALL')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [importExportOpen, setImportExportOpen] = useState<ImportKind | null>(null)
  const [editing, setEditing] = useState<AssessmentListItem | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<AssessmentListItem | null>(null)

  const canCreate = useHasPermission(PERMISSIONS.assessmentCreate)
  const canUpdate = useHasPermission(PERMISSIONS.assessmentUpdate)
  const canDelete = useHasPermission(PERMISSIONS.assessmentDelete)
  const canWaive = useHasPermission(PERMISSIONS.financeWaive)
  const canExport = useHasPermission(PERMISSIONS.financeExport)

  const { data, isLoading, isFetching } = useAssessments({
    page,
    limit: 10,
    search: search || undefined,
    status: status === 'ALL' ? undefined : status,
    ...(isDues ? { category: 'DUES' as const } : { excludeCategory: 'DUES' as const }),
  })

  const issueAssessment = useIssueAssessment()
  const cancelAssessment = useCancelAssessment()
  const waiveAssessment = useWaiveAssessment()
  const deleteAssessment = useDeleteAssessment()

  const columns: Column<AssessmentListItem>[] = [
    {
      key: 'assessmentNumber',
      header: 'Assessment',
      cell: (row) => (
        <button type="button" className="text-left" onClick={() => setDetailId(row.id)}>
          <p className="font-medium hover:underline">{row.assessmentNumber}</p>
          <p className="text-xs text-muted-foreground">{row.title}</p>
        </button>
      ),
    },
    {
      key: 'household',
      header: 'Household',
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.household ? householdLabel(row.household) : '—'}
        </span>
      ),
      hideBelow: 'md',
    },
    {
      key: 'dueDate',
      header: 'Due date',
      cell: (row) => <span className="text-muted-foreground">{formatDate(row.dueDate)}</span>,
      hideBelow: 'lg',
    },
    {
      key: 'amount',
      header: 'Amount',
      cell: (row) => <span className="font-medium">{formatCurrency(row.amount)}</span>,
      className: 'text-right',
    },
    {
      key: 'paidAmount',
      header: 'Paid',
      cell: (row) => (
        <span className="text-muted-foreground">{formatCurrency(row.paidAmount)}</span>
      ),
      className: 'text-right',
      hideBelow: 'md',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setDetailId(row.id)}>View</DropdownMenuItem>
            {row.status === 'DRAFT' ? (
              <DropdownMenuItem onClick={() => issueAssessment.mutate(row.id)}>
                <Send className="h-4 w-4" />
                Issue
              </DropdownMenuItem>
            ) : null}
            {(row.status === 'DRAFT' || row.status === 'ISSUED' || row.status === 'PARTIALLY_PAID' || row.status === 'OVERDUE') ? (
              <DropdownMenuItem onClick={() => cancelAssessment.mutate(row.id)}>
                <XCircle className="h-4 w-4" />
                Cancel
              </DropdownMenuItem>
            ) : null}
            {canWaive && (row.status === 'ISSUED' || row.status === 'PARTIALLY_PAID' || row.status === 'OVERDUE') ? (
              <DropdownMenuItem onClick={() => waiveAssessment.mutate(row.id)}>
                <Wallet className="h-4 w-4" />
                Waive
              </DropdownMenuItem>
            ) : null}
            {canUpdate ? (
              <DropdownMenuItem onClick={() => setEditing(row)}>
                <Pencil className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
            ) : null}
            {canDelete ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleting(row)}
                >
                  Delete
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={isDues ? 'Search monthly dues…' : 'Search charges…'}
            className="pl-9"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as AssessmentStatus | 'ALL')
            setPage(1)
          }}
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {ASSESSMENT_STATUSES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canCreate ? (
          <>
            {isDues ? (
              <>
                <Button variant="outline" onClick={() => setGenerateOpen(true)}>
                  Generate dues
                </Button>
                <Button variant="outline" onClick={() => setSettingsOpen(true)}>
                  <Settings2 className="h-4 w-4" />
                  Settings
                </Button>
              </>
            ) : null}
            {canExport ? (
              <Button
                variant="outline"
                className={isDues ? undefined : 'sm:ml-auto'}
                onClick={() => setImportExportOpen('assessments')}
              >
                <FileDown className="h-4 w-4" />
                Import / export
              </Button>
            ) : null}
            <Button className={isDues ? 'sm:ml-auto' : undefined} onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" />
              {isDues ? 'New assessment' : 'New charge'}
            </Button>
          </>
        ) : null}
        {isFetching ? <span className="text-xs text-muted-foreground">Updating…</span> : null}
      </div>

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage={isDues ? 'No monthly dues found.' : 'No charges found.'}
      />

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <AssessmentFormDialog
        open={formOpen || Boolean(editing)}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        assessment={editing}
      />
      <GenerateDuesDialog open={generateOpen} onOpenChange={setGenerateOpen} />
      {isDues && settingsOpen ? (
        <DuesSettingsDialog onOpenChange={setSettingsOpen} />
      ) : null}
      <ImportExportDialog
        open={importExportOpen !== null}
        onOpenChange={(open) => {
          if (!open) setImportExportOpen(null)
        }}
        initialKind={importExportOpen ?? 'assessments'}
      />
      <AssessmentDetailDialog
        assessmentId={detailId}
        open={Boolean(detailId)}
        onOpenChange={(open) => {
          if (!open) setDetailId(null)
        }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title="Delete assessment?"
        description={`"${deleting?.assessmentNumber}" will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleteAssessment.isPending}
        onConfirm={() => {
          if (deleting) deleteAssessment.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }}
      />
    </div>
  )
}

function PaymentsTab() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<PaymentStatus | 'ALL'>('ALL')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [importExportOpen, setImportExportOpen] = useState<ImportKind | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<PaymentListItem | null>(null)
  const [cancelling, setCancelling] = useState<PaymentListItem | null>(null)
  const [rejecting, setRejecting] = useState<PaymentListItem | null>(null)

  const canCreate = useHasPermission(PERMISSIONS.paymentCreate)
  const canUpdate = useHasPermission(PERMISSIONS.paymentUpdate)
  const canDelete = useHasPermission(PERMISSIONS.paymentDelete)
  const canExport = useHasPermission(PERMISSIONS.financeExport)
  const canVerify = useHasPermission(PERMISSIONS.financeVerify)
  const canReject = useHasPermission(PERMISSIONS.financeReject)
  const canRefund = useHasPermission(PERMISSIONS.financeRefund)
  const canCancel = useHasPermission(PERMISSIONS.paymentCancel)

  const { data, isLoading, isFetching } = usePayments({
    page,
    limit: 10,
    search: search || undefined,
    status: status === 'ALL' ? undefined : status,
  })

  const { data: editingPayment } = usePayment(editingId)

  const verifyPayment = useVerifyPayment()
  const refundPayment = useRefundPayment()
  const cancelPayment = useCancelPayment()
  const deletePayment = useDeletePayment()

  const columns: Column<PaymentListItem>[] = [
    {
      key: 'paymentNumber',
      header: 'Payment',
      cell: (row) => (
        <button type="button" className="text-left" onClick={() => setDetailId(row.id)}>
          <p className="font-medium hover:underline">{row.paymentNumber}</p>
          <p className="text-xs text-muted-foreground">
            {row.resident ? `${row.resident.firstName} ${row.resident.lastName}` : '—'}
          </p>
        </button>
      ),
    },
    {
      key: 'allocations',
      header: 'Assessment',
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.allocations.length > 0
            ? row.allocations
                .map((allocation) => allocation.assessment.assessmentNumber)
                .filter((value, index, arr) => arr.indexOf(value) === index)
                .join(', ')
            : row.chargeType?.name ?? '—'}
        </span>
      ),
      hideBelow: 'md',
    },
    {
      key: 'paymentDate',
      header: 'Date',
      cell: (row) => <span className="text-muted-foreground">{formatDate(row.paymentDate)}</span>,
      hideBelow: 'lg',
    },
    {
      key: 'method',
      header: 'Method',
      cell: (row) => <span className="text-muted-foreground">{toTitleCase(row.method)}</span>,
      hideBelow: 'md',
    },
    {
      key: 'amount',
      header: 'Amount',
      cell: (row) => <span className="font-medium">{formatCurrency(row.amount)}</span>,
      className: 'text-right',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setDetailId(row.id)}>View</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setReceiptId(row.id)}>
              <Receipt className="h-4 w-4" />
              Receipt
            </DropdownMenuItem>
            {row.status === 'PENDING_VERIFICATION' ? (
              <>
                {canVerify ? (
                  <DropdownMenuItem onClick={() => verifyPayment.mutate(row.id)}>
                    <Check className="h-4 w-4" />
                    Verify
                  </DropdownMenuItem>
                ) : null}
                {canReject ? (
                  <DropdownMenuItem onClick={() => setRejecting(row)}>
                    <XCircle className="h-4 w-4" />
                    Reject
                  </DropdownMenuItem>
                ) : null}
              </>
            ) : null}
            {row.status === 'VERIFIED' && canRefund ? (
              <DropdownMenuItem onClick={() => refundPayment.mutate(row.id)}>
                <RotateCcw className="h-4 w-4" />
                Refund
              </DropdownMenuItem>
            ) : null}
            {canCancel && row.status === 'PENDING_VERIFICATION' ? (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setCancelling(row)}
              >
                <XCircle className="h-4 w-4" />
                Cancel
              </DropdownMenuItem>
            ) : null}
            {canUpdate ? (
              <DropdownMenuItem onClick={() => setEditingId(row.id)}>
                <Pencil className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
            ) : null}
            {canDelete ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleting(row)}
                >
                  Delete
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search payments…"
            className="pl-9"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as PaymentStatus | 'ALL')
            setPage(1)
          }}
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_STATUSES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canExport ? (
          <Button variant="outline" onClick={() => setImportExportOpen('payments')}>
            <FileDown className="h-4 w-4" />
            Import / export
          </Button>
        ) : null}
        {canCreate ? (
          <Button className={canExport ? undefined : 'sm:ml-auto'} onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Record payment
          </Button>
        ) : null}
        {isFetching ? <span className="text-xs text-muted-foreground">Updating…</span> : null}
      </div>

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage="No payments found."
      />

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <PaymentFormDialog
        open={formOpen || Boolean(editingId)}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingId(null)
        }}
        payment={editingPayment}
      />
      <PaymentDetailDialog
        paymentId={detailId}
        open={Boolean(detailId)}
        onOpenChange={(open) => {
          if (!open) setDetailId(null)
        }}
      />
      <PaymentReceiptDialog
        paymentId={receiptId}
        open={Boolean(receiptId)}
        onOpenChange={(open) => {
          if (!open) setReceiptId(null)
        }}
      />
      <RejectPaymentDialog
        payment={rejecting}
        open={Boolean(rejecting)}
        onOpenChange={(open) => {
          if (!open) setRejecting(null)
        }}
      />
      <ImportExportDialog
        open={importExportOpen !== null}
        onOpenChange={(open) => {
          if (!open) setImportExportOpen(null)
        }}
        initialKind={importExportOpen ?? 'payments'}
      />
      <ConfirmDialog
        open={Boolean(cancelling)}
        onOpenChange={(open) => {
          if (!open) setCancelling(null)
        }}
        title="Cancel payment?"
        description={`"${cancelling?.paymentNumber}" will be cancelled. The resident will be notified.`}
        confirmLabel="Cancel payment"
        destructive
        loading={cancelPayment.isPending}
        onConfirm={() => {
          if (cancelling) cancelPayment.mutate(cancelling.id, { onSuccess: () => setCancelling(null) })
        }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title="Delete payment?"
        description={`"${deleting?.paymentNumber}" will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deletePayment.isPending}
        onConfirm={() => {
          if (deleting) deletePayment.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }}
      />
    </div>
  )
}

function ChargeTypesTab() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ChargeType | null>(null)
  const [deleting, setDeleting] = useState<ChargeType | null>(null)

  const canManage = useHasPermission(PERMISSIONS.financeManage)
  const { data, isLoading, isFetching } = useChargeTypes({
    page,
    limit: 10,
    search: search || undefined,
  })
  const deleteChargeType = useDeleteChargeType()

  const columns: Column<ChargeType>[] = [
    {
      key: 'name',
      header: 'Charge type',
      cell: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.code}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      cell: (row) => <StatusBadge status={row.category} />,
      hideBelow: 'md',
    },
    {
      key: 'recurrence',
      header: 'Recurrence',
      cell: (row) => <span className="text-muted-foreground">{toTitleCase(row.recurrence)}</span>,
      hideBelow: 'md',
    },
    {
      key: 'amount',
      header: 'Amount',
      cell: (row) => <span className="font-medium">{formatCurrency(row.amount)}</span>,
      className: 'text-right',
    },
    {
      key: 'allowAdvancePayment',
      header: 'Advance',
      cell: (row) => (row.allowAdvancePayment ? <StatusBadge status="YES" variant="info" /> : <span className="text-muted-foreground">—</span>),
      className: 'text-center',
      hideBelow: 'lg',
    },
    {
      key: 'isActive',
      header: 'Status',
      cell: (row) => (row.isActive ? <StatusBadge status="ACTIVE" /> : <StatusBadge status="INACTIVE" />),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canManage ? (
              <>
                <DropdownMenuItem onClick={() => setEditing(row)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleting(row)}
                >
                  Delete
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search charge types…"
            className="pl-9"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
        </div>
        {canManage ? (
          <Button className="sm:ml-auto" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            New charge type
          </Button>
        ) : null}
        {isFetching ? <span className="text-xs text-muted-foreground">Updating…</span> : null}
      </div>

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage="No charge types found."
      />

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <ChargeTypeFormDialog
        open={formOpen || Boolean(editing)}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        chargeType={editing}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title="Delete charge type?"
        description={`"${deleting?.name}" will be deactivated. Existing assessments are preserved.`}
        confirmLabel="Delete"
        destructive
        loading={deleteChargeType.isPending}
        onConfirm={() => {
          if (deleting) deleteChargeType.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }}
      />
    </div>
  )
}

function BillingPeriodsTab() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState<BillingPeriod | null>(null)

  const canManage = useHasPermission(PERMISSIONS.financeManage)
  const { data, isLoading, isFetching } = useBillingPeriods({
    page,
    limit: 10,
    search: search || undefined,
  })
  const deleteBillingPeriod = useDeleteBillingPeriod()

  const columns: Column<BillingPeriod>[] = [
    {
      key: 'label',
      header: 'Period',
      cell: (row) => (
        <div>
          <p className="font-medium">{row.label}</p>
          <p className="text-xs text-muted-foreground">{row.periodKey}</p>
        </div>
      ),
    },
    {
      key: 'chargeType',
      header: 'Charge type',
      cell: (row) => <span className="text-muted-foreground">{row.chargeType.name}</span>,
      hideBelow: 'md',
    },
    {
      key: 'dueDate',
      header: 'Due date',
      cell: (row) => <span className="text-muted-foreground">{formatDate(row.dueDate)}</span>,
      hideBelow: 'lg',
    },
    {
      key: 'amount',
      header: 'Amount',
      cell: (row) => <span className="font-medium">{formatCurrency(row.amount)}</span>,
      className: 'text-right',
    },
    {
      key: '_count',
      header: 'Assessments',
      cell: (row) => <span className="text-muted-foreground">{row._count?.assessments ?? 0}</span>,
      className: 'text-center',
      hideBelow: 'md',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search billing periods…"
            className="pl-9"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
        </div>
        {canManage ? (
          <Button className="sm:ml-auto" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Manage periods
          </Button>
        ) : null}
        {isFetching ? <span className="text-xs text-muted-foreground">Updating…</span> : null}
      </div>

      <DataTable
        columns={[
          ...columns,
          ...(canManage
            ? [
                {
                  key: 'actions',
                  header: <span className="sr-only">Actions</span>,
                  cell: (row: BillingPeriod) => (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleting(row)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ),
                } as Column<BillingPeriod>,
              ]
            : []),
        ]}
        rows={data?.items ?? []}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage="No billing periods found."
      />

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <BillingPeriodDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title="Delete billing period?"
        description={`"${deleting?.label}" will be cancelled. Periods with assessments cannot be deleted.`}
        confirmLabel="Delete"
        destructive
        loading={deleteBillingPeriod.isPending}
        onConfirm={() => {
          if (deleting) deleteBillingPeriod.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }}
      />
    </div>
  )
}

function ExpensesTab() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ExpenseCategory | 'ALL'>('ALL')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [importExportOpen, setImportExportOpen] = useState<ImportKind | null>(null)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [deleting, setDeleting] = useState<Expense | null>(null)

  const canCreate = useHasPermission(PERMISSIONS.financeExpenseCreate)
  const canUpdate = useHasPermission(PERMISSIONS.financeExpenseUpdate)
  const canDelete = useHasPermission(PERMISSIONS.financeExpenseDelete)
  const canExport = useHasPermission(PERMISSIONS.financeExport)

  const { data, isLoading, isFetching } = useExpenses({
    page,
    limit: 10,
    search: search || undefined,
    category: category === 'ALL' ? undefined : category,
  })

  const deleteExpense = useDeleteExpense()

  const columns: Column<Expense>[] = [
    {
      key: 'expenseNumber',
      header: 'Expense',
      cell: (row) => (
        <div>
          <p className="font-medium">{row.expenseNumber}</p>
          <p className="text-xs text-muted-foreground">{row.title}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      cell: (row) => <StatusBadge status={row.category} />,
      hideBelow: 'md',
    },
    {
      key: 'expenseDate',
      header: 'Date',
      cell: (row) => <span className="text-muted-foreground">{formatDate(row.expenseDate)}</span>,
      hideBelow: 'lg',
    },
    {
      key: 'payee',
      header: 'Payee',
      cell: (row) => <span className="text-muted-foreground">{row.payee ?? '—'}</span>,
      hideBelow: 'lg',
    },
    {
      key: 'amount',
      header: 'Amount',
      cell: (row) => <span className="font-medium text-destructive">{formatCurrency(row.amount)}</span>,
      className: 'text-right',
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canUpdate ? (
              <DropdownMenuItem onClick={() => setEditing(row)}>
                <Pencil className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
            ) : null}
            {canDelete ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleting(row)}
                >
                  Delete
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search expenses…"
            className="pl-9"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
        </div>
        <Select
          value={category}
          onValueChange={(value) => {
            setCategory(value as ExpenseCategory | 'ALL')
            setPage(1)
          }}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All categories</SelectItem>
            {EXPENSE_CATEGORIES.map((option) => (
              <SelectItem key={option} value={option}>
                {toTitleCase(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canExport ? (
          <Button variant="outline" onClick={() => setImportExportOpen('expenses')}>
            <FileDown className="h-4 w-4" />
            Import / export
          </Button>
        ) : null}
        {canCreate ? (
          <Button className={canExport ? undefined : 'sm:ml-auto'} onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Record expense
          </Button>
        ) : null}
        {isFetching ? <span className="text-xs text-muted-foreground">Updating…</span> : null}
      </div>

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage="No expenses recorded yet."
      />

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <ExpenseFormDialog
        open={formOpen || Boolean(editing)}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        expense={editing}
      />
      <ImportExportDialog
        open={importExportOpen !== null}
        onOpenChange={(open) => {
          if (!open) setImportExportOpen(null)
        }}
        initialKind={importExportOpen ?? 'expenses'}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title="Delete expense?"
        description={`"${deleting?.expenseNumber}" will be removed from the records. This affects the income statement.`}
        confirmLabel="Delete"
        destructive
        loading={deleteExpense.isPending}
        onConfirm={() => {
          if (deleting) deleteExpense.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }}
      />
    </div>
  )
}

function IncomeStatementTab() {
  const { data, isLoading } = useIncomeStatement()

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading income statement…</p>
  }

  return <IncomeStatementView statement={data} />
}

function HouseholdUtilityBillingSection() {
  const canManage = useHasPermission(PERMISSIONS.financeManage)
  const canImport = useHasPermission(PERMISSIONS.financeImport)
  const canExport = useHasPermission(PERMISSIONS.financeExport)

  const [rateDialogOpen, setRateDialogOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<UtilityBillingConfig | null>(null)
  const [deletingConfig, setDeletingConfig] = useState<UtilityBillingConfig | null>(null)
  const [readingDialogOpen, setReadingDialogOpen] = useState(false)
  const [editingReading, setEditingReading] = useState<UtilityReading | null>(null)
  const [deletingReading, setDeletingReading] = useState<UtilityReading | null>(null)
  const [importExportOpen, setImportExportOpen] = useState<ImportKind | null>(null)

  const currentPeriodKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  const [readingsPeriod, setReadingsPeriod] = useState(currentPeriodKey)

  const { data: configData, isLoading: configsLoading } = useUtilityConfigs({ limit: 50 })
  const { data: readingData, isLoading: readingsLoading } = useUtilityReadings({
    limit: 20,
    periodKey: readingsPeriod || undefined,
  })
  const deleteConfig = useDeleteUtilityConfig()
  const deleteReading = useDeleteUtilityReading()
  const generateBills = useGenerateUtilityBills((result) => {
    if (result.noReadings > 0) {
      toast.info(`${result.noReadings} household(s) had no meter reading for ${result.periodKey}.`)
    }
  })

  const configs = configData?.items ?? []
  const configLabels = new Map(configs.map((config) => [config.id, toTitleCase(config.utilityType) + (config.name ? ` – ${config.name}` : '')]))
  const readings = readingData?.items ?? []

  const describeConfig = (config: UtilityBillingConfig) => {
    if (config.rateMode === 'METERED') {
      return config.unitRate != null
        ? `${formatCurrency(Number(config.unitRate))} per unit used`
        : 'Per usage'
    }
    return config.fixedRate != null
      ? `${formatCurrency(Number(config.fixedRate))} per household`
      : 'Fixed amount'
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Gauge className="h-4 w-4" />
            Household utility billing
          </h3>
          <p className="text-xs text-muted-foreground">
            Bill each household for the utilities they actually use.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canImport || canExport ? (
            <Button variant="outline" size="sm" onClick={() => setImportExportOpen('utility-readings')}>
              <FileDown className="h-4 w-4" />
              Import / export
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingReading(null)
              setReadingDialogOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />
            Record reading
          </Button>
          {canManage ? (
            <>
              <Button variant="outline" size="sm" onClick={() => generateBills.mutate({ periodKey: currentPeriodKey })}
                disabled={generateBills.isPending}
                title={`Create this month's utility charges (${currentPeriodKey})`}
              >
                Generate bills
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEditingConfig(null)
                  setRateDialogOpen(true)
                }}
              >
                <Plus className="h-4 w-4" />
                Add rate
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rates</CardTitle>
        </CardHeader>
        <CardContent>
          {configsLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : configs.length ? (
            <div className="space-y-2">
              {configs.map((config) => (
                <div
                  key={config.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {toTitleCase(config.utilityType)}
                      {config.name ? ` – ${config.name}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">{describeConfig(config)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!config.isActive ? <StatusBadge status="INACTIVE" /> : null}
                    {canManage ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setEditingConfig(config)
                            setRateDialogOpen(true)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeletingConfig(config)}
                        >
                          <XCircle className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No utility rates yet. Add one to start billing water, electricity, and more per household.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full sm:w-48">
          <Input
            type="month"
            value={readingsPeriod}
            onChange={(event) => setReadingsPeriod(event.target.value)}
            aria-label="Filter readings by billing month"
          />
        </div>
        <span className="text-xs text-muted-foreground">Meter readings for the selected month</span>
      </div>

      <DataTable
        columns={[
          {
            key: 'period',
            header: 'Month',
            cell: (row) => <span className="text-muted-foreground">{row.periodKey}</span>,
          },
          {
            key: 'household',
            header: 'Household',
            cell: (row) => householdLabel(row.household),
          },
          {
            key: 'utility',
            header: 'Utility',
            hideBelow: 'md',
            cell: (row) => (
              <span className="text-muted-foreground">{configLabels.get(row.utilityConfigId) ?? '—'}</span>
            ),
          },
          {
            key: 'usage',
            header: 'Previous → Current / Usage',
            cell: (row) => (
              <div className="text-right">
                <p className="font-medium">{Number(row.usage)} units</p>
                <p className="text-xs text-muted-foreground">
                  {row.previousReading != null ? Number(row.previousReading) : '—'} →{' '}
                  {row.currentReading != null ? Number(row.currentReading) : '—'}
                </p>
              </div>
            ),
            className: 'text-right',
          },
          {
            key: 'actions',
            header: <span className="sr-only">Actions</span>,
            cell: (row) =>
              canManage ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingReading(row)
                        setReadingDialogOpen(true)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeletingReading(row)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null,
          },
        ]}
        rows={readings}
        keyExtractor={(row) => row.id}
        isLoading={readingsLoading}
        emptyMessage={
          readingsPeriod
            ? `No meter readings recorded for ${readingsPeriod}.`
            : 'No meter readings recorded yet.'
        }
      />

      {rateDialogOpen ? (
        <UtilityRateDialog
          onOpenChange={setRateDialogOpen}
          config={editingConfig}
        />
      ) : null}
      {readingDialogOpen ? (
        <UtilityReadingDialog
          onOpenChange={setReadingDialogOpen}
          reading={editingReading}
          defaultPeriodKey={currentPeriodKey}
        />
      ) : null}
      <ImportExportDialog
        open={importExportOpen !== null}
        onOpenChange={(open) => {
          if (!open) setImportExportOpen(null)
        }}
        initialKind={importExportOpen ?? 'utility-readings'}
      />
      <ConfirmDialog
        open={Boolean(deletingConfig)}
        onOpenChange={(open) => {
          if (!open) setDeletingConfig(null)
        }}
        title="Remove utility rate?"
        description={`${deletingConfig ? toTitleCase(deletingConfig.utilityType) : 'This rate'} will stop being offered for new billing.`}
        confirmLabel="Remove"
        destructive
        loading={deleteConfig.isPending}
        onConfirm={() => {
          if (deletingConfig) deleteConfig.mutate(deletingConfig.id, { onSuccess: () => setDeletingConfig(null) })
        }}
      />
      <ConfirmDialog
        open={Boolean(deletingReading)}
        onOpenChange={(open) => {
          if (!open) setDeletingReading(null)
        }}
        title="Delete meter reading?"
        description="Any bill already generated from this reading stays in place."
        confirmLabel="Delete"
        destructive
        loading={deleteReading.isPending}
        onConfirm={() => {
          if (deletingReading) deleteReading.mutate(deletingReading.id, { onSuccess: () => setDeletingReading(null) })
        }}
      />
    </div>
  )
}

function UtilitiesTab() {
  const [search, setSearch] = useState('')
  const [utilityType, setUtilityType] = useState<UtilityType | 'ALL'>('ALL')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<UtilityExpense | null>(null)
  const [deleting, setDeleting] = useState<UtilityExpense | null>(null)

  const canCreate = useHasPermission(PERMISSIONS.financeExpenseCreate)
  const canUpdate = useHasPermission(PERMISSIONS.financeExpenseUpdate)
  const canDelete = useHasPermission(PERMISSIONS.financeExpenseDelete)

  const { data, isLoading, isFetching } = useUtilityExpenses({
    page,
    limit: 10,
    search: search || undefined,
    utilityType: utilityType === 'ALL' ? undefined : utilityType,
  })

  const { data: summary } = useUtilityExpenseSummary()

  const deleteExpense = useDeleteUtilityExpense()

  const columns: Column<UtilityExpense>[] = [
    {
      key: 'utilityNumber',
      header: 'Utility',
      cell: (row) => (
        <div>
          <p className="font-medium">{row.utilityNumber}</p>
          <p className="text-xs text-muted-foreground">{row.providerName}</p>
        </div>
      ),
    },
    {
      key: 'utilityType',
      header: 'Type',
      cell: (row) => <StatusBadge status={row.utilityType} />,
      hideBelow: 'md',
    },
    {
      key: 'billingPeriod',
      header: 'Period',
      cell: (row) => <span className="text-muted-foreground">{row.billingPeriod ?? '—'}</span>,
      hideBelow: 'lg',
    },
    {
      key: 'expenseDate',
      header: 'Date',
      cell: (row) => <span className="text-muted-foreground">{formatDate(row.expenseDate)}</span>,
      hideBelow: 'lg',
    },
    {
      key: 'amount',
      header: 'Amount',
      cell: (row) => <span className="font-medium text-destructive">{formatCurrency(row.amount)}</span>,
      className: 'text-right',
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canUpdate ? (
              <DropdownMenuItem onClick={() => setEditing(row)}>
                <Pencil className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
            ) : null}
            {canDelete ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleting(row)}
                >
                  Delete
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <HouseholdUtilityBillingSection />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Provider bills (what the community pays)</h3>
          <p className="text-xs text-muted-foreground">
            Bills received from utility providers, recorded as community expenses.
          </p>
        </div>
      </div>
      {summary ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Total Utilities</p>
              <p className="text-2xl font-bold">{formatCurrency(summary.totalAmount)}</p>
              <p className="text-xs text-muted-foreground">{summary.totalCount} records</p>
            </CardContent>
          </Card>
          {summary.byType.slice(0, 2).map((item) => (
            <Card key={item.type}>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">{toTitleCase(item.type)}</p>
                <p className="text-2xl font-bold">{formatCurrency(item.total)}</p>
                <p className="text-xs text-muted-foreground">{item.count} records</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search utilities…"
            className="pl-9"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
        </div>
        <Select
          value={utilityType}
          onValueChange={(value) => {
            setUtilityType(value as UtilityType | 'ALL')
            setPage(1)
          }}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Utility type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            {UTILITY_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {toTitleCase(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canCreate ? (
          <Button className="sm:ml-auto" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Record utility expense
          </Button>
        ) : null}
        {isFetching ? <span className="text-xs text-muted-foreground">Updating…</span> : null}
      </div>

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage="No utility expenses recorded yet."
      />

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <UtilityExpenseFormDialog
        open={formOpen || Boolean(editing)}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        expense={editing}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title="Delete utility expense?"
        description={`"${deleting?.utilityNumber}" will be removed from the records. This affects the income statement.`}
        confirmLabel="Delete"
        destructive
        loading={deleteExpense.isPending}
        onConfirm={() => {
          if (deleting) deleteExpense.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }}
      />
    </div>
  )
}

function IncomeStatementView({ statement }: { statement?: IncomeStatement }) {
  const summary = statement?.summary

  const expenseColumns: Column<IncomeStatement['expenses'][number]>[] = [
    {
      key: 'expenseNumber',
      header: 'Expense',
      cell: (row) => (
        <div>
          <p className="font-medium">{row.expenseNumber}</p>
          <p className="text-xs text-muted-foreground">{row.title}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      cell: (row) => <StatusBadge status={row.category} />,
      hideBelow: 'md',
    },
    {
      key: 'expenseDate',
      header: 'Date',
      cell: (row) => <span className="text-muted-foreground">{formatDate(row.expenseDate)}</span>,
      hideBelow: 'lg',
    },
    {
      key: 'payee',
      header: 'Payee',
      cell: (row) => <span className="text-muted-foreground">{row.payee ?? '—'}</span>,
      hideBelow: 'lg',
    },
    {
      key: 'amount',
      header: 'Amount',
      cell: (row) => <span className="font-medium text-destructive">{formatCurrency(row.amount)}</span>,
      className: 'text-right',
    },
  ]

  return (
    <div className="space-y-4">
      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Collected (income)</p>
              <p className="mt-1 text-xl font-semibold text-success">{formatCurrency(summary.income)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Expenses</p>
              <p className="mt-1 text-xl font-semibold text-destructive">{formatCurrency(summary.expenses)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Fund balance</p>
              <p className={`mt-1 text-xl font-semibold ${summary.fundBalance < 0 ? 'text-destructive' : ''}`}>
                {formatCurrency(summary.fundBalance)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Billed (receivable)</p>
              <p className="mt-1 text-xl font-semibold">{formatCurrency(summary.billed)}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {statement?.categories.length ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BadgeDollarSign className="h-4 w-4" />
                Expenses by category
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {statement.categories.map((item) => (
                <div
                  key={item.category}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{toTitleCase(item.category)}</p>
                    <p className="text-xs text-muted-foreground">{item.count} record{item.count === 1 ? '' : 's'}</p>
                  </div>
                  <span className="font-semibold text-destructive">{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {statement?.monthly.length ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Landmark className="h-4 w-4" />
                Monthly summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Income</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statement.monthly.map((row) => (
                    <TableRow key={row.month}>
                      <TableCell>{formatDate(`${row.month}-01`, 'MMM yyyy')}</TableCell>
                      <TableCell className="text-right text-success">{formatCurrency(row.income)}</TableCell>
                      <TableCell className="text-right text-destructive">{formatCurrency(row.expenses)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.income - row.expenses)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expense records</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={expenseColumns}
            rows={statement?.expenses ?? []}
            keyExtractor={(row) => row.id}
            isLoading={!statement}
            emptyMessage="No expenses recorded yet."
          />
        </CardContent>
      </Card>
    </div>
  )
}
