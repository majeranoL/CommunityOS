import { useState } from 'react'
import { MoreHorizontal, Pencil, Plus, Puzzle, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { Pagination } from '@/components/shared/pagination'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useFeatures, useDeleteFeature } from '@/features/admin/hooks/use-features'
import { FeatureAssignDialog } from '@/features/admin/components/feature-assign-dialog'
import { FeatureCommunitiesDialog } from '@/features/admin/components/feature-communities-dialog'
import { FeatureFormDialog } from '@/features/admin/components/feature-form-dialog'
import type { Feature } from '@/features/admin/types/feature'

export default function AdminFeaturesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [assigning, setAssigning] = useState<Feature | null>(null)
  const [communities, setCommunities] = useState<Feature | null>(null)
  const [editing, setEditing] = useState<Feature | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Feature | null>(null)

  const deleteFeature = useDeleteFeature()

  const { data, isLoading } = useFeatures({
    page,
    limit: 10,
    search: query || undefined,
  })

  const submitSearch = () => {
    setPage(1)
    setQuery(search.trim())
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Features"
        description="Optional functionality catalog and per-community assignments."
      >
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New feature
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Feature catalog</CardTitle>
              <CardDescription>Assign optional features to communities.</CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8 sm:w-64"
                  placeholder="Search features…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
                />
              </div>
              <Button variant="secondary" className="sm:w-auto" onClick={submitSearch}>
                Search
              </Button>
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
                    <TableHead>Feature</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Communities</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((feature) => (
                    <TableRow key={feature.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <Puzzle className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{feature.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{feature.code}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={feature.type === 'OPTIONAL' ? 'warning' : 'secondary'}>
                          {feature.type === 'OPTIONAL' ? 'Optional' : 'Standard'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={feature.isActive ? 'success' : 'muted'}>
                          {feature.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {feature._count?.communityFeatures ?? 0} assigned
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditing(feature)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setCommunities(feature)}>
                              <Puzzle className="mr-2 h-4 w-4" />
                              Communities
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setAssigning(feature)}>
                              <Search className="mr-2 h-4 w-4" />
                              Assign
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleting(feature)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination className="mt-4" pagination={data.pagination} onPageChange={setPage} />
            </>
          ) : (
            <EmptyState
              icon={Puzzle}
              title="No features found"
              description="Try adjusting your search."
            />
          )}
        </CardContent>
      </Card>

      <FeatureFormDialog
        open={creating || Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false)
            setEditing(null)
          }
        }}
        feature={editing}
      />
      <FeatureAssignDialog
        open={Boolean(assigning)}
        onOpenChange={(open) => !open && setAssigning(null)}
        feature={assigning}
      />
      <FeatureCommunitiesDialog
        open={Boolean(communities)}
        onOpenChange={(open) => !open && setCommunities(null)}
        feature={communities}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete feature?"
        description={`This will permanently remove "${deleting?.name}". It must have no active community assignments.`}
        confirmLabel="Delete"
        destructive
        loading={deleteFeature.isPending}
        onConfirm={() =>
          deleting &&
          deleteFeature.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }
      />
    </div>
  )
}
