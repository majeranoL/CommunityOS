import { useState } from 'react'
import { MoreHorizontal, Plus, Search, Send, Check, XCircle, RotateCcw, Pencil } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Pagination } from '@/components/shared/pagination'
import { StatusBadge } from '@/components/shared/status-badge'
import { DataTable, type Column } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  useConfirmPayment,
  useRejectPayment,
  useRefundPayment,
  useIssueAssessment,
  useCancelAssessment,
} from '@/features/finance/hooks/use-finance'
import { AssessmentFormDialog } from '@/features/finance/components/assessment-form-dialog'
import { AssessmentDetailDialog } from '@/features/finance/components/assessment-detail-dialog'
import { PaymentFormDialog } from '@/features/finance/components/payment-form-dialog'
import { PaymentDetailDialog } from '@/features/finance/components/payment-detail-dialog'
import { householdLabel } from '@/features/finance/components/household-select'
import type { AssessmentListItem, AssessmentStatus, PaymentListItem, PaymentStatus } from '@/features/finance/types/finance'
import { formatCurrency, formatDate, toTitleCase } from '@/lib/format'

const ASSESSMENT_STATUSES: Array<{ value: AssessmentStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ISSUED', label: 'Issued' },
  { value: 'PARTIALLY_PAID', label: 'Partially paid' },
  { value: 'PAID', label: 'Paid' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const PAYMENT_STATUSES: Array<{ value: PaymentStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'REFUNDED', label: 'Refunded' },
]

export default function FinancePage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Finance"
        description="Manage community assessments and resident payments."
      />
      <Tabs defaultValue="assessments">
        <TabsList>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>
        <TabsContent value="assessments">
          <AssessmentsTab />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AssessmentsTab() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<AssessmentStatus | 'ALL'>('ALL')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AssessmentListItem | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<AssessmentListItem | null>(null)

  const canCreate = useHasPermission(PERMISSIONS.assessmentCreate)
  const canUpdate = useHasPermission(PERMISSIONS.assessmentUpdate)
  const canDelete = useHasPermission(PERMISSIONS.assessmentDelete)

  const { data, isLoading, isFetching } = useAssessments({
    page,
    limit: 10,
    search: search || undefined,
    status: status === 'ALL' ? undefined : status,
  })

  const issueAssessment = useIssueAssessment()
  const cancelAssessment = useCancelAssessment()
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
            {(row.status === 'DRAFT' || row.status === 'ISSUED' || row.status === 'PARTIALLY_PAID') ? (
              <DropdownMenuItem onClick={() => cancelAssessment.mutate(row.id)}>
                <XCircle className="h-4 w-4" />
                Cancel
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
          <Button className="sm:ml-auto" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            New assessment
          </Button>
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
  const [editing, setEditing] = useState<PaymentListItem | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<PaymentListItem | null>(null)

  const canCreate = useHasPermission(PERMISSIONS.paymentCreate)
  const canUpdate = useHasPermission(PERMISSIONS.paymentUpdate)
  const canDelete = useHasPermission(PERMISSIONS.paymentDelete)

  const { data, isLoading, isFetching } = usePayments({
    page,
    limit: 10,
    search: search || undefined,
    status: status === 'ALL' ? undefined : status,
  })

  const confirmPayment = useConfirmPayment()
  const rejectPayment = useRejectPayment()
  const refundPayment = useRefundPayment()
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
      key: 'assessment',
      header: 'Assessment',
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.assessment ? `${row.assessment.assessmentNumber} · ${row.assessment.title}` : '—'}
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
            {row.status === 'PENDING' ? (
              <>
                <DropdownMenuItem onClick={() => confirmPayment.mutate(row.id)}>
                  <Check className="h-4 w-4" />
                  Confirm
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => rejectPayment.mutate(row.id)}>
                  <XCircle className="h-4 w-4" />
                  Reject
                </DropdownMenuItem>
              </>
            ) : null}
            {row.status === 'CONFIRMED' ? (
              <DropdownMenuItem onClick={() => refundPayment.mutate(row.id)}>
                <RotateCcw className="h-4 w-4" />
                Refund
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
        open={formOpen || Boolean(editing)}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        payment={editing}
      />
      <PaymentDetailDialog
        paymentId={detailId}
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
