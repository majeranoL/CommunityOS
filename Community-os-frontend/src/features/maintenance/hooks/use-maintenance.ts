import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import { maintenanceService } from '@/features/maintenance/services/maintenance'
import type {
  CreateMaintenanceInput,
  MaintenanceListItem,
  UpdateMaintenanceInput,
} from '@/features/maintenance/types/maintenance'
import type { ListQuery } from '@/types/api'

export const maintenanceKeys = {
  all: ['maintenance'] as const,
  list: (params: ListQuery) => ['maintenance', 'list', params] as const,
  detail: (id: string) => ['maintenance', 'detail', id] as const,
}

export function useMaintenanceList(params: ListQuery) {
  return useQuery({
    queryKey: maintenanceKeys.list(params),
    queryFn: () => maintenanceService.list(params),
    placeholderData: (previous) => previous,
  })
}

export function useMaintenance(id: string | null) {
  return useQuery({
    queryKey: maintenanceKeys.detail(id ?? ''),
    queryFn: () => maintenanceService.get(id as string),
    enabled: Boolean(id),
  })
}

export function useCreateMaintenance(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateMaintenanceInput) => maintenanceService.create(input),
    onSuccess: () => {
      toast.success('Maintenance request created.')
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to create maintenance request.')),
  })
}

export function useUpdateMaintenance(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateMaintenanceInput }) =>
      maintenanceService.update(id, input),
    onSuccess: () => {
      toast.success('Maintenance request updated.')
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to update maintenance request.')),
  })
}

export function useAssignMaintenance(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, staffId }: { id: string; staffId: string }) =>
      maintenanceService.assign(id, staffId),
    onSuccess: () => {
      toast.success('Maintenance request assigned.')
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to assign maintenance request.')),
  })
}

function useStatusAction(
  action: (id: string) => Promise<MaintenanceListItem>,
  message: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => action(id),
    onSuccess: () => {
      toast.success(message)
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.all })
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Action failed.')),
  })
}

export function useStartMaintenance() {
  return useStatusAction((id) => maintenanceService.start(id), 'Maintenance started.')
}

export function useResolveMaintenance() {
  return useStatusAction((id) => maintenanceService.resolve(id), 'Maintenance resolved.')
}

export function useCancelMaintenance() {
  return useStatusAction((id) => maintenanceService.cancel(id), 'Maintenance cancelled.')
}

export function useDeleteMaintenance(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => maintenanceService.remove(id),
    onSuccess: () => {
      toast.success('Maintenance request removed.')
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to remove maintenance request.')),
  })
}
