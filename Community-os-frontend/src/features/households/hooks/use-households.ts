import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import { householdsService } from '@/features/households/services/households'
import type {
  CreateHouseholdInput,
  UpdateHouseholdInput,
} from '@/features/households/types/household'
import type { ListQuery } from '@/types/api'

export const householdKeys = {
  all: ['households'] as const,
  list: (params: ListQuery) => ['households', 'list', params] as const,
  detail: (id: string) => ['households', 'detail', id] as const,
  me: ['households', 'me'] as const,
  blockOptions: ['households', 'block-options'] as const,
}

export function useHouseholds(params: ListQuery) {
  return useQuery({
    queryKey: householdKeys.list(params),
    queryFn: () => householdsService.list(params),
    placeholderData: (previous) => previous,
  })
}

export function useHouseholdBlockOptions() {
  return useQuery({
    queryKey: householdKeys.blockOptions,
    queryFn: () => householdsService.blockOptions(),
  })
}

export function useHousehold(id: string | null) {
  return useQuery({
    queryKey: householdKeys.detail(id ?? ''),
    queryFn: () => householdsService.get(id as string),
    enabled: Boolean(id),
  })
}

export function useMyHousehold() {
  return useQuery({
    queryKey: householdKeys.me,
    queryFn: () => householdsService.me(),
  })
}

export function useHouseholdSearch(search: string) {
  return useQuery({
    queryKey: ['household-search', search],
    queryFn: () => householdsService.search(search),
    enabled: search.trim().length >= 2,
  })
}

export function useMyAcquisitionRequests() {
  return useQuery({
    queryKey: ['household-acquisition-requests', 'mine'],
    queryFn: () => householdsService.acquisitionRequests(),
  })
}

export function useRequestHousehold(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { householdId?: string; requestedBlock?: string; requestedLot?: string; requestedUnit?: string; requestedAddress?: string; notes?: string }) => householdsService.requestAcquisition(input),
    onSuccess: () => {
      toast.success('Household request submitted for review.')
      queryClient.invalidateQueries({ queryKey: ['household-acquisition-requests'] })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to submit household request.')),
  })
}

export function useOfficerAcquisitionRequests() {
  return useQuery({
    queryKey: ['household-acquisition-requests', 'officer'],
    queryFn: () => householdsService.officerAcquisitionRequests(),
  })
}

export function useReviewHouseholdRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, reviewNotes }: { id: string; status: 'APPROVED' | 'REJECTED'; reviewNotes?: string }) => householdsService.reviewAcquisitionRequest(id, status, reviewNotes),
    onSuccess: () => {
      toast.success('Household request updated.')
      queryClient.invalidateQueries({ queryKey: ['household-acquisition-requests'] })
      queryClient.invalidateQueries({ queryKey: householdKeys.all })
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to review household request.')),
  })
}

export function useCreateHousehold(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateHouseholdInput) =>
      householdsService.create(input),
    onSuccess: () => {
      toast.success('Household added.')
      queryClient.invalidateQueries({ queryKey: householdKeys.all })
      onSuccess?.()
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, 'Failed to add household.')),
  })
}

export function useUpdateHousehold(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateHouseholdInput }) =>
      householdsService.update(id, input),
    onSuccess: () => {
      toast.success('Household updated.')
      queryClient.invalidateQueries({ queryKey: householdKeys.all })
      onSuccess?.()
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, 'Failed to update household.')),
  })
}

export function useDeleteHousehold(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => householdsService.remove(id),
    onSuccess: () => {
      toast.success('Household removed.')
      queryClient.invalidateQueries({ queryKey: householdKeys.all })
      onSuccess?.()
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, 'Failed to remove household.')),
  })
}

export function useTransferOwnership(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, newOwnerResidentId }: { id: string; newOwnerResidentId: string }) =>
      householdsService.transferOwnership(id, newOwnerResidentId),
    onSuccess: () => {
      toast.success('Ownership transferred.')
      queryClient.invalidateQueries({ queryKey: householdKeys.all })
      onSuccess?.()
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, 'Failed to transfer ownership.')),
  })
}

export function useDeactivateHousehold(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => householdsService.deactivate(id),
    onSuccess: () => {
      toast.success('Household deactivated.')
      queryClient.invalidateQueries({ queryKey: householdKeys.all })
      onSuccess?.()
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, 'Failed to deactivate household.')),
  })
}

export function useReactivateHousehold(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => householdsService.reactivate(id),
    onSuccess: () => {
      toast.success('Household reactivated.')
      queryClient.invalidateQueries({ queryKey: householdKeys.all })
      onSuccess?.()
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, 'Failed to reactivate household.')),
  })
}
