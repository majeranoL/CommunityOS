import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import {
  facilityItemsService,
  type ItemLoanListParams,
} from '@/features/facilities/services/facility-items'
import type {
  BorrowItemInput,
  FacilityItemInput,
} from '@/features/facilities/types/facility-item'

export const facilityItemKeys = {
  all: ['facility-items'] as const,
  items: ['facility-items', 'items'] as const,
  loans: (params: unknown) => ['facility-items', 'loans', params] as const,
}

export function useFacilityItems() {
  return useQuery({
    queryKey: facilityItemKeys.items,
    queryFn: () => facilityItemsService.listItems(),
  })
}

export function useCreateFacilityItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: FacilityItemInput) => facilityItemsService.createItem(input),
    onSuccess: () => {
      toast.success('Item created.')
      queryClient.invalidateQueries({ queryKey: facilityItemKeys.all })
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to create item.')),
  })
}

export function useUpdateFacilityItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<FacilityItemInput> }) =>
      facilityItemsService.updateItem(id, input),
    onSuccess: () => {
      toast.success('Item updated.')
      queryClient.invalidateQueries({ queryKey: facilityItemKeys.all })
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to update item.')),
  })
}

export function useDeleteFacilityItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => facilityItemsService.removeItem(id),
    onSuccess: () => {
      toast.success('Item removed.')
      queryClient.invalidateQueries({ queryKey: facilityItemKeys.all })
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to remove item.')),
  })
}

export function useFacilityItemLoans(params: ItemLoanListParams = {}) {
  return useQuery({
    queryKey: facilityItemKeys.loans(params),
    queryFn: () => facilityItemsService.listLoans(params),
  })
}

export function useBorrowItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, input }: { itemId: string; input: BorrowItemInput }) =>
      facilityItemsService.borrow(itemId, input),
    onSuccess: () => {
      toast.success('Borrow request submitted.')
      queryClient.invalidateQueries({ queryKey: facilityItemKeys.all })
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to submit request.')),
  })
}

export function useApproveLoan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (loanId: string) => facilityItemsService.approveLoan(loanId),
    onSuccess: () => {
      toast.success('Borrow request approved.')
      queryClient.invalidateQueries({ queryKey: facilityItemKeys.all })
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to approve request.')),
  })
}

export function useRejectLoan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ loanId, reason }: { loanId: string; reason?: string }) =>
      facilityItemsService.rejectLoan(loanId, reason),
    onSuccess: () => {
      toast.success('Borrow request rejected.')
      queryClient.invalidateQueries({ queryKey: facilityItemKeys.all })
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to reject request.')),
  })
}

export function useReturnLoan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ loanId }: { loanId: string }) =>
      facilityItemsService.returnLoan(loanId),
    onSuccess: () => {
      toast.success('Items marked as returned.')
      queryClient.invalidateQueries({ queryKey: facilityItemKeys.all })
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to mark returned.')),
  })
}

export function useCancelLoan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (loanId: string) => facilityItemsService.cancelLoan(loanId),
    onSuccess: () => {
      toast.success('Request cancelled.')
      queryClient.invalidateQueries({ queryKey: facilityItemKeys.all })
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to cancel request.')),
  })
}
