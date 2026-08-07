import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import { pollsService } from '@/features/polls/services/polls'
import type { CreatePollInput, UpdatePollInput } from '@/features/polls/types/poll'
import type { ListQuery } from '@/types/api'

export const pollKeys = {
  all: ['polls'] as const,
  list: (params: ListQuery) => ['polls', 'list', params] as const,
  detail: (id: string) => ['polls', 'detail', id] as const,
}

export function usePolls(params: ListQuery) {
  return useQuery({
    queryKey: pollKeys.list(params),
    queryFn: () => pollsService.list(params),
    placeholderData: (previous) => previous,
  })
}

export function usePoll(id: string | null) {
  return useQuery({
    queryKey: pollKeys.detail(id ?? ''),
    queryFn: () => pollsService.get(id as string),
    enabled: Boolean(id),
  })
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: pollKeys.all })
}

export function useCreatePoll(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePollInput) => pollsService.create(input),
    onSuccess: () => {
      toast.success('Poll created.')
      invalidateAll(queryClient)
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to create poll.')),
  })
}

export function useUpdatePoll(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePollInput }) =>
      pollsService.update(id, input),
    onSuccess: () => {
      toast.success('Poll updated.')
      invalidateAll(queryClient)
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to update poll.')),
  })
}

export function usePublishPoll() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => pollsService.publish(id),
    onSuccess: () => {
      toast.success('Poll opened for voting.')
      invalidateAll(queryClient)
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to open poll.')),
  })
}

export function useClosePoll() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => pollsService.close(id),
    onSuccess: () => {
      toast.success('Poll closed.')
      invalidateAll(queryClient)
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to close poll.')),
  })
}

export function useVote(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, optionIds }: { id: string; optionIds: string[] }) =>
      pollsService.vote(id, optionIds),
    onSuccess: () => {
      toast.success('Vote recorded.')
      invalidateAll(queryClient)
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to record vote.')),
  })
}

export function useAddOption() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => pollsService.addOption(id, text),
    onSuccess: () => {
      toast.success('Option added.')
      invalidateAll(queryClient)
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to add option.')),
  })
}

export function useDeletePoll(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => pollsService.remove(id),
    onSuccess: () => {
      toast.success('Poll deleted.')
      invalidateAll(queryClient)
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to delete poll.')),
  })
}
