import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useAnnouncement } from '@/features/announcements/hooks/use-announcements'
import { formatDate } from '@/lib/format'

interface AnnouncementDetailDialogProps {
  announcementId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AnnouncementDetailDialog({ announcementId, open, onOpenChange }: AnnouncementDetailDialogProps) {
  const { data: announcement, isLoading } = useAnnouncement(announcementId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Announcement</DialogTitle>
          <DialogDescription>
            {announcement ? `Published ${formatDate(announcement.publishedAt)}` : ''}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !announcement ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {announcement.coverImageUrl ? (
              <img
                src={announcement.coverImageUrl}
                alt={announcement.title}
                className="h-40 w-full rounded-md object-cover"
              />
            ) : null}
            <div className="flex items-center gap-2">
              <Badge variant={announcement.status === 'PUBLISHED' ? 'success' : announcement.status === 'DRAFT' ? 'secondary' : 'muted'}>
                {announcement.status}
              </Badge>
              <span className="text-xs text-muted-foreground">Created {formatDate(announcement.createdAt)}</span>
            </div>
            <h3 className="text-lg font-semibold">{announcement.title}</h3>
            <Separator />
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{announcement.content}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
