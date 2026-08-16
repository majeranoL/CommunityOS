import { useState } from 'react'
import { Search } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { useAdminCommunities } from '@/features/admin/hooks/use-admin'
import {
  useAssignFeature,
  useFeatureCommunities,
} from '@/features/admin/hooks/use-features'
import type { Feature } from '@/features/admin/types/feature'

interface FeatureAssignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  feature: Feature | null
}

export function FeatureAssignDialog({ open, onOpenChange, feature }: FeatureAssignDialogProps) {
  const [search, setSearch] = useState('')

  const { data, isLoading } = useAdminCommunities({
    page: 1,
    limit: 50,
    search: search || undefined,
  })

  const { data: assignments, isLoading: assignmentsLoading } = useFeatureCommunities(
    open ? (feature?.id ?? null) : null,
  )

  const assignFeature = useAssignFeature()

  const assignedIds = new Set((assignments ?? []).map((assignment) => assignment.communityId))
  const available = (data?.items ?? []).filter((community) => !assignedIds.has(community.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign {feature?.name}</DialogTitle>
          <DialogDescription>
            Enable this feature for a community. Assigned communities can be configured in the
            Communities view.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search communities…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="max-h-72 space-y-1 overflow-y-auto">
          {isLoading || assignmentsLoading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : available.length ? (
            available.map((community) => (
              <div
                key={community.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{community.displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {community.code} · {community.status.toLowerCase()}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={assignFeature.isPending}
                  onClick={() =>
                    feature &&
                    assignFeature.mutate({ featureId: feature.id, input: { communityId: community.id } })
                  }
                >
                  Assign
                </Button>
              </div>
            ))
          ) : (
            <EmptyState
              icon={Search}
              title="No communities available"
              description="All matching communities already have this feature."
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
