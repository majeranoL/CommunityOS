import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Copy, ExternalLink, Plus, Search } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { storefrontUrl } from '@/lib/storefront-url'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { Pagination } from '@/components/shared/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAdminCommunities } from '@/features/admin/hooks/use-admin'
import { formatDate } from '@/lib/format'

export default function AdminCommunitiesPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('ALL')
  const [query, setQuery] = useState('')

  const { data, isLoading } = useAdminCommunities({
    page,
    limit: 10,
    search: query || undefined,
    status: status === 'ALL' ? undefined : status,
  })

  const submitSearch = () => {
    setPage(1)
    setQuery(search.trim())
  }

  const copyStorefrontLink = async (
    slug: string,
    displayName: string,
    event?: React.MouseEvent,
  ) => {
    event?.stopPropagation()
    try {
      await navigator.clipboard.writeText(storefrontUrl(slug))
      toast.success(`Storefront link copied for ${displayName}`)
    } catch {
      toast.error('Could not copy the link')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Communities"
        description="All HOAs running on CommunityOS."
      >
        <Button onClick={() => navigate('/admin/communities/new')}>
          <Plus className="h-4 w-4" />
          Provision community
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Communities</CardTitle>
              <CardDescription>
                Search, filter, and manage tenant communities.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8 sm:w-64"
                  placeholder="Search communities…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
                />
              </div>
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : data?.items.length ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Community</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Residents</TableHead>
                    <TableHead>Storefront</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((community) => (
                    <TableRow
                      key={community.id}
                      className="cursor-pointer"
                      onClick={() =>
                        navigate(`/admin/communities/${community.id}`)
                      }
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {community.displayName}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {community.code}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={community.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {community.subscription?.plan?.name ?? '—'}
                      </TableCell>
                      <TableCell>{community._count?.users ?? 0}</TableCell>
                      <TableCell>{community._count?.residents ?? 0}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <a
                            href={storefrontUrl(community.slug)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-primary hover:bg-accent hover:underline"
                            title="Open storefront"
                          >
                            /c/{community.slug}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            title="Copy storefront link"
                            onClick={(event) =>
                              copyStorefrontLink(
                                community.slug,
                                community.displayName,
                                event,
                              )
                            }
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(community.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                className="mt-4"
                pagination={data.pagination}
                onPageChange={setPage}
              />
            </>
          ) : (
            <EmptyState
              icon={Building2}
              title="No communities found"
              description="Try adjusting your search or filters, or provision a new community."
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
