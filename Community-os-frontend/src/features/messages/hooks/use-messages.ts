import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import { messagesService } from '@/features/messages/services/messages'
import type { CreateMessageInput } from '@/features/messages/types/message'
import type { ListQuery } from '@/types/api'

export const messageKeys = {
  all: ['messages'] as const,
  list: (params: ListQuery) => ['messages', 'list', params] as const,
  detail: (id: string) => ['messages', 'detail', id] as const,
}

export function useMessages(params: ListQuery) {
  return useQuery({
    queryKey: messageKeys.list(params),
    queryFn: () => messagesService.list(params),
    placeholderData: (previous) => previous,
  })
}

export function useMessage(id: string | null) {
  return useQuery({
    queryKey: messageKeys.detail(id ?? ''),
    queryFn: () => messagesService.get(id as string),
    enabled: Boolean(id),
  })
}

export function useCreateMessage(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateMessageInput) => messagesService.create(input),
    onSuccess: () => {
      toast.success('Message sent.')
      queryClient.invalidateQueries({ queryKey: messageKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to send message.')),
  })
}

export function useMarkMessageRead(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => messagesService.markAsRead(id),
    onSuccess: () => {
      toast.success('Message marked as read.')
      queryClient.invalidateQueries({ queryKey: messageKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Action failed.')),
  })
}

export function useDeleteMessage(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => messagesService.remove(id),
    onSuccess: () => {
      toast.success('Message deleted.')
      queryClient.invalidateQueries({ queryKey: messageKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to delete message.')),
  })
}
