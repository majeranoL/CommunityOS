import { useState } from 'react'
import { Mail, MailCheck, Plus, Search, Send, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Pagination } from '@/components/shared/pagination'
import { StatusBadge } from '@/components/shared/status-badge'
import { DataTable, type Column } from '@/components/shared/data-table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useHasPermission } from '@/store/auth-store'
import { useAuthStore } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import {
  useDeleteMessage,
  useMarkMessageRead,
  useMessages,
} from '@/features/messages/hooks/use-messages'
import { MessageFormDialog } from '@/features/messages/components/message-form-dialog'
import type { MessageListItem } from '@/features/messages/types/message'
import { formatDateTime, toTitleCase } from '@/lib/format'

const STATUS_FILTERS = ['ALL', 'SENT', 'DELIVERED', 'READ'] as const

export default function MessagesPage() {
  const [mailbox, setMailbox] = useState<'inbox' | 'outbox'>('inbox')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('ALL')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)

  const currentUserId = useAuthStore((state) => state.user?.id)
  const canCreate = useHasPermission(PERMISSIONS.messageCreate)

  const { data, isLoading, isFetching } = useMessages({
    page,
    limit: 10,
    mailbox,
    search: search || undefined,
    status: status === 'ALL' ? undefined : status,
  })

  const markRead = useMarkMessageRead()
  const deleteMessage = useDeleteMessage()

  const personName = (row: MessageListItem, kind: 'sender' | 'recipient') =>
    row[kind] ? `${row[kind]!.firstName} ${row[kind]!.lastName}` : null

  const isReadableBroadcastBySender = (row: MessageListItem) =>
    row.recipientId === null && row.senderId === currentUserId

  const subjectCell = (row: MessageListItem) => (
    <div className="max-w-md leading-tight">
      <p className="truncate font-medium">{row.subject}</p>
      <p className="line-clamp-1 text-xs text-muted-foreground">{row.body}</p>
    </div>
  )

  const deleteCell = (row: MessageListItem) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-destructive hover:text-destructive"
      onClick={() => {
        if (window.confirm(`Delete message "${row.subject}"?`)) deleteMessage.mutate(row.id)
      }}
      disabled={deleteMessage.isPending}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )

  const inboxColumns: Column<MessageListItem>[] = [
    {
      key: 'from',
      header: 'From',
      cell: (row) => {
        const name = personName(row, 'sender')
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <Send className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="leading-tight">
              <p className="font-medium">{name ?? '—'}</p>
              {row.recipientId === null ? (
                <p className="text-xs text-muted-foreground">Broadcast</p>
              ) : null}
            </div>
          </div>
        )
      },
    },
    {
      key: 'subject',
      header: 'Subject',
      cell: subjectCell,
    },
    {
      key: 'sent',
      header: 'Sent',
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.sentAt ? formatDateTime(row.sentAt) : '—'}
        </span>
      ),
      hideBelow: 'md',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          {row.status !== 'READ' && !isReadableBroadcastBySender(row) ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => markRead.mutate(row.id)}
              disabled={markRead.isPending}
            >
              <MailCheck className="h-4 w-4" />
              Mark read
            </Button>
          ) : null}
          {deleteCell(row)}
        </div>
      ),
    },
  ]

  const outboxColumns: Column<MessageListItem>[] = [
    {
      key: 'to',
      header: 'To',
      cell: (row) => {
        const name = personName(row, 'recipient')
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <Mail className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="leading-tight">
              <p className="font-medium">{name ?? 'All members'}</p>
              {row.recipientId === null ? (
                <p className="text-xs text-muted-foreground">Broadcast</p>
              ) : null}
            </div>
          </div>
        )
      },
    },
    {
      key: 'subject',
      header: 'Subject',
      cell: subjectCell,
    },
    {
      key: 'sent',
      header: 'Sent',
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.sentAt ? formatDateTime(row.sentAt) : '—'}
        </span>
      ),
      hideBelow: 'md',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">{deleteCell(row)}</div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Messages" description="Direct messages and broadcasts to your community.">
        {canCreate ? (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Compose
          </Button>
        ) : null}
      </PageHeader>

      <Tabs
        value={mailbox}
        onValueChange={(value) => {
          setMailbox(value as 'inbox' | 'outbox')
          setPage(1)
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="inbox">Inbox</TabsTrigger>
            <TabsTrigger value="outbox">Outbox</TabsTrigger>
          </TabsList>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search subject or sender…"
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
                setStatus(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="sm:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option === 'ALL' ? 'All statuses' : toTitleCase(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isFetching ? <span className="text-xs text-muted-foreground">Updating…</span> : null}
          </div>
        </div>

        <TabsContent value="inbox">
          <DataTable
            columns={inboxColumns}
            rows={data?.items ?? []}
            keyExtractor={(row) => row.id}
            isLoading={isLoading}
            emptyMessage="Your inbox is empty."
          />
        </TabsContent>
        <TabsContent value="outbox">
          <DataTable
            columns={outboxColumns}
            rows={data?.items ?? []}
            keyExtractor={(row) => row.id}
            isLoading={isLoading}
            emptyMessage="No sent messages."
          />
        </TabsContent>
      </Tabs>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <MessageFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}
