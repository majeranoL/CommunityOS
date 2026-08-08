import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import { vehiclesService } from '@/features/vehicles/services/vehicles'
import type { CreateVehicleInput, UpdateVehicleInput } from '@/features/vehicles/types/vehicle'
import type { ListQuery } from '@/types/api'

export const vehicleKeys = {
  all: ['vehicles'] as const,
  list: (params: ListQuery) => ['vehicles', 'list', params] as const,
  detail: (id: string) => ['vehicles', 'detail', id] as const,
}

export function useVehicles(params: ListQuery) {
  return useQuery({
    queryKey: vehicleKeys.list(params),
    queryFn: () => vehiclesService.list(params),
    placeholderData: (previous) => previous,
  })
}

export function useVehicle(id: string | null) {
  return useQuery({
    queryKey: vehicleKeys.detail(id ?? ''),
    queryFn: () => vehiclesService.get(id as string),
    enabled: Boolean(id),
  })
}

export function useCreateVehicle(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateVehicleInput) => vehiclesService.create(input),
    onSuccess: () => {
      toast.success('Vehicle added.')
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to add vehicle.')),
  })
}

export function useUpdateVehicle(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateVehicleInput }) =>
      vehiclesService.update(id, input),
    onSuccess: () => {
      toast.success('Vehicle updated.')
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to update vehicle.')),
  })
}

export function useDeleteVehicle(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => vehiclesService.remove(id),
    onSuccess: () => {
      toast.success('Vehicle removed.')
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to remove vehicle.')),
  })
}
