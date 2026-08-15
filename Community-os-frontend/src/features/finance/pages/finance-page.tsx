import { useState } from 'react'
import { MoreHorizontal, Plus, Search, Send, Check, XCircle, RotateCcw, Pencil, Wallet, Receipt } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Pagination } from '@/components/shared/pagination'
import { StatusBadge } from '@/components/shared/status-badge'
import { DataTable, type Column } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useHasPermission } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
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
  useFinanceTransactions,
  useDeleteChargeType,
  useDeleteBillingPeriod,
  useCancelPayment,
  usePayment,
} from '@/features/finance/hooks/use-finance'
import { AssessmentFormDialog } from '@/features/finance/components/assessment-form-dialog'
import { AssessmentDetailDialog } from '@/features/finance/components/assessment-detail-dialog'
import { GenerateDuesDialog } from '@/features/finance/components/generate-dues-dialog'
import { MyBalanceCard } from '@/features/finance/components/my-balance-card'
import { PaymentFormDialog } from '@/features/finance/components/payment-form-dialog'
import { PaymentDetailDialog } from '@/features/finance/components/payment-detail-dialog'
import { PaymentReceiptDialog } from '@/features/finance/components/payment-receipt-dialog'
import { RejectPaymentDialog } from '@/features/finance/components/reject-payment-dialog'
import { ChargeTypeFormDialog } from '@/features/finance/components/charge-type-form-dialog'
import { BillingPeriodDialog } from '@/features/finance/components/billing-period-dialog'
import { ImportExportPanel } from '@/features/finance/components/import-export-panel'
import { householdLabel } from '@/features/finance/components/household-select'
import type {
  AssessmentListItem,
  AssessmentStatus,
  BillingPeriod,
  ChargeType,
  FinanceTransaction,
  PaymentListItem,
  PaymentStatus,
} from '@/features/finance/types/finance'
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

export default function FinancePage() {
  const canCreateAssessment = useHasPermission(PERMISSIONS.assessmentCreate)
  const canCreatePayment = useHasPermission(PERMISSIONS.paymentCreate)
  const canViewOwn = useHasPermission(PERMISSIONS.financeViewOwn)
  const canViewAll = useHasPermission(PERMISSIONS.financeViewAll)
  const canManage = useHasPermission(PERMISSIONS.financeManage)
  const canImport = useHasPermission(PERMISSIONS.financeImport)
  const canExport = useHasPermission(PERMISSIONS.financeExport)

  const isManager = canCreateAssessment || canCreatePayment || canManage
  const showOverview = canViewOwn || canViewAll || canManage
  const showAssessments = canCreateAssessment || canViewAll || canManage
  const showPayments = canCreatePayment || canViewAll || canViewOwn || canManage
  const showChargeTypes = canViewAll || canManage
  const showBillingPeriods = canViewAll || canManage
  const showImportExport = canImport || canExport

  const tabs: Array<{ value: string; label: string }> = []
  if (showOverview) tabs.push({ value: 'overview', label: 'Overview' })
  if (showAssessments) tabs.push({ value: 'assessments', label: 'Assessments' })
  if (showPayments) tabs.push({ value: 'payments', label: 'Payments' })
  if (showChargeTypes) tabs.push({ value: 'charge-types', label: 'Charge types' })
  if (showBillingPeriods) tabs.push({ value: 'billing-periods', label: 'Billing periods' })
  if (showImportExport) tabs.push({ value: 'import-export', label: 'Import / export' })

  return (
    <div className="space-y-4">
      <PageHeader
        title="Finance"
        description="Assessments, payments, billing periods, and the community ledger."
      />
      {!isManager ? <MyBalanceCard /> : null}
      <Tabs defaultValue={tabs[0]?.value ?? 'overview'}>
        <TabsList className="flex-wrap">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {showOverview ? (
          <TabsContent value="overview">
            <OverviewTab />
          </TabsContent>
        ) : null}
        {showAssessments ? (
          <TabsContent value="assessments">
            <AssessmentsTab />
          </TabsContent>
        ) : null}
        {showPayments ? (
          <TabsContent value="payments">
            <PaymentsTab />
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
      </Tabs>
    </div>
  )
}

function OverviewTab() {
  const [search, setSearch] = useState('')
  const [type, setType] = useState<'ALL' | 'payment' | 'charge'>('ALL')
  const [page, setPage] = useState(1)

  const { data, isLoading, isFetching } = useFinanceTransactions({
    page,
    limit: 15,
    search: search || undefined,
    type: type === 'ALL' ? undefined : type,
  })

  const summary = data?.summary

  const columns: Column<FinanceTransaction>[] = [
    {
      key: 'date',
      header: 'Date',
      cell: (row) => <span className="text-muted-foreground">{formatDate(row.date)}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      cell: (row) => (
        <div>
          <p className="font-medium">{row.description}</p>
          <p className="text-xs text-muted-foreground">
            {toTitleCase(row.category)}
            {row.reference ? ` · ${row.reference}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'household',
      header: 'Household',
      cell: (row) => (
        <span className="text-muted-foreground">{row.household ? householdLabel(row.household) : '—'}</span>
      ),
      hideBelow: 'md',
    },
    {
      key: 'type',
      header: 'Type',
      cell: (row) => <StatusBadge status={row.type} />,
      hideBelow: 'lg',
    },
    {
      key: 'amount',
      header: 'Amount',
      cell: (row) => (
        <span className={`font-medium ${row.type === 'payment' ? 'text-success' : 'text-destructive'}`}>
          {row.type === 'payment' ? '+' : '−'}
          {formatCurrency(Math.abs(row.amount))}
        </span>
      ),
      className: 'text-right',
    },
  ]

  return (
    <div className="space-y-4">
      {summary ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Collected</p>
              <p className="mt-1 text-xl font-semibold text-success">{formatCurrency(summary.income)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Charged</p>
              <p className="mt-1 text-xl font-semibold text-destructive">{formatCurrency(summary.expenses)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Net</p>
              <p className="mt-1 text-xl font-semibold">{formatCurrency(summary.balance)}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search the ledger…"
            className="pl-9"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
        </div>
        <Select
          value={type}
          onValueChange={(value) => {
            setType(value as typeof type)
            setPage(1)
          }}
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All entries</SelectItem>
            <SelectItem value="payment">Payments</SelectItem>
            <SelectItem value="charge">Charges</SelectItem>
          </SelectContent>
        </Select>
        {isFetching ? <span className="text-xs text-muted-foreground">Updating…</span> : null}
      </div>
      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage="No ledger entries found."
      />
      <Pagination pagination={data?.pagination} onPageChange={setPage} />
    </div>
  )
}

function AssessmentsTab() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<AssessmentStatus | 'ALL'>('ALL')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [editing, setEditing] = useState<AssessmentListItem | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<AssessmentListItem | null>(null)

  const canCreate = useHasPermission(PERMISSIONS.assessmentCreate)
  const canUpdate = useHasPermission(PERMISSIONS.assessmentUpdate)
  const canDelete = useHasPermission(PERMISSIONS.assessmentDelete)
  const canWaive = useHasPermission(PERMISSIONS.financeWaive)

  const { data, isLoading, isFetching } = useAssessments({
    page,
    limit: 10,
    search: search || undefined,
    status: status === 'ALL' ? undefined : status,
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
            placeholder="Search assessments…"
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
            <Button variant="outline" onClick={() => setGenerateOpen(true)}>
              Generate dues
            </Button>
            <Button className="sm:ml-auto" onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" />
              New assessment
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
        emptyMessage="No assessments found."
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<PaymentListItem | null>(null)
  const [cancelling, setCancelling] = useState<PaymentListItem | null>(null)
  const [rejecting, setRejecting] = useState<PaymentListItem | null>(null)

  const canCreate = useHasPermission(PERMISSIONS.paymentCreate)
  const canUpdate = useHasPermission(PERMISSIONS.paymentUpdate)
  const canDelete = useHasPermission(PERMISSIONS.paymentDelete)
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
        {canCreate ? (
          <Button className="sm:ml-auto" onClick={() => setFormOpen(true)}>
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
