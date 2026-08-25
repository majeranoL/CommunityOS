import { useState } from 'react'
import { Loader2, Receipt, Eye } from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'
import { DataTable, type Column } from '@/components/shared/data-table'
import { Pagination } from '@/components/shared/pagination'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePayments } from '@/features/finance/hooks/use-finance'
import { PaymentDetailDialog } from '@/features/finance/components/payment-detail-dialog'
import { PaymentReceiptDialog } from '@/features/finance/components/payment-receipt-dialog'
import { formatCurrency, formatDate, toTitleCase } from '@/lib/format'
import type { PaymentListItem } from '@/features/finance/types/finance'

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'PENDING_VERIFICATION', label: 'Pending' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const

export function MyPaymentsTab() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('ALL')
  const [detailPaymentId, setDetailPaymentId] = useState<string | null>(null)
  const [receiptPaymentId, setReceiptPaymentId] = useState<string | null>(null)

  const { data, isLoading } = usePayments({
    page,
    limit: 10,
    search: search || undefined,
    status: status === 'ALL' ? undefined : status,
  })

  const columns: Column<PaymentListItem>[] = [
    {
      key: 'paymentNumber',
      header: 'Payment',
      cell: (row) => (
        <div>
          <span className="font-medium">{row.paymentNumber}</span>
        </div>
      ),
    },
    {
      key: 'allocations',
      header: 'Assessment',
      cell: (row) => {
        const nums = [
          ...new Set(
            row.allocations?.map((a) => a.assessment?.assessmentNumber).filter(Boolean),
          ),
        ]
        return (
          <span className="text-muted-foreground">
            {nums.length > 0 ? nums.join(', ') : row.chargeType?.name ?? '\u2014'}
          </span>
        )
      },
      hideBelow: 'md',
    },
    {
      key: 'paymentDate',
      header: 'Date',
      cell: (row) => formatDate(row.paymentDate),
      hideBelow: 'lg',
    },
    {
      key: 'method',
      header: 'Method',
      cell: (row) => toTitleCase(row.method),
      hideBelow: 'md',
    },
    {
      key: 'amount',
      header: 'Amount',
      cell: (row) => (
        <span className="font-medium text-right block">{formatCurrency(row.amount)}</span>
      ),
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
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Eye className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setDetailPaymentId(row.id)}>
              <Eye className="h-4 w-4" />
              View details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setReceiptPaymentId(row.id)}>
              <Receipt className="h-4 w-4" />
              Receipt
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading payments…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search payments…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="max-w-xs"
        />
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable columns={columns} rows={data?.items ?? []} keyExtractor={(row) => row.id} />

      {data?.pagination && data.pagination.totalPages > 1 ? (
        <Pagination
          pagination={data.pagination}
          onPageChange={setPage}
        />
      ) : null}

      <PaymentDetailDialog
        paymentId={detailPaymentId}
        open={detailPaymentId !== null}
        onOpenChange={(o) => {
          if (!o) setDetailPaymentId(null)
        }}
      />

      <PaymentReceiptDialog
        paymentId={receiptPaymentId}
        open={receiptPaymentId !== null}
        onOpenChange={(o) => {
          if (!o) setReceiptPaymentId(null)
        }}
      />
    </div>
  )
}
