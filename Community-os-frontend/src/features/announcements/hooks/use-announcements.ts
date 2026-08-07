import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import { announcementsService } from '@/features/announcements/services/announcements'
import type {
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from '@/features/announcements/types/announcement'
import type { ListQuery } from '@/types/api'

export const announcementKeys = {
  all: ['announcements'] as const,
  list: (params: ListQuery) => ['announcements', 'list', params] as const,
  detail: (id: string) => ['announcements', 'detail', id] as const,
}

export function useAnnouncements(params: ListQuery) {
  return useQuery({
    queryKey: announcementKeys.list(params),
    queryFn: () => announcementsService.list(params),
    placeholderData: (previous) => previous,
  })
}

export function useAnnouncement(id: string | null) {
  return useQuery({
    queryKey: announcementKeys.detail(id ?? ''),
    queryFn: () => announcementsService.get(id as string),
    enabled: Boolean(id),
  })
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: announcementKeys.all })
}

export function useCreateAnnouncement(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAnnouncementInput) => announcementsService.create(input),
    onSuccess: () => {
      toast.success('Announcement created.')
      invalidateAll(queryClient)
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to create announcement.')),
  })
}

export function useUpdateAnnouncement(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAnnouncementInput }) =>
      announcementsService.update(id, input),
    onSuccess: () => {
      toast.success('Announcement updated.')
      invalidateAll(queryClient)
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to update announcement.')),
  })
}

export function usePublishAnnouncement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => announcementsService.publish(id),
    onSuccess: () => {
      toast.success('Announcement published.')
      invalidateAll(queryClient)
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to publish announcement.')),
  })
}

export function useDeleteAnnouncement(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => announcementsService.remove(id),
    onSuccess: () => {
      toast.success('Announcement deleted.')
      invalidateAll(queryClient)
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to delete announcement.')),
  })
}
