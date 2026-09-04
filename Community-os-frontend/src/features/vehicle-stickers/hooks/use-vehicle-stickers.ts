import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import { vehicleStickersService } from '@/features/vehicle-stickers/services/vehicle-stickers'
import type {
  CreateStickerInput,
  RenewStickerInput,
  RequestStickerInput,
  UpdateStickerInput,
  VerifyStickerInput,
} from '@/features/vehicle-stickers/types/vehicle-sticker'
import type { ListQuery } from '@/types/api'

export const stickerKeys = {
  all: ['vehicle-stickers'] as const,
  list: (params: ListQuery) => ['vehicle-stickers', 'list', params] as const,
  detail: (id: string) => ['vehicle-stickers', 'detail', id] as const,
  byVehicle: (vehicleId: string) => ['vehicle-stickers', 'vehicle', vehicleId] as const,
  options: ['vehicle-stickers', 'options'] as const,
}

export function useStickerOptions(enabled = true) {
  return useQuery({
    queryKey: stickerKeys.options,
    queryFn: () => vehicleStickersService.options(),
    enabled,
  })
}

export function useRequestSticker(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RequestStickerInput) => vehicleStickersService.request(input),
    onSuccess: () => {
      toast.success('Sticker request submitted.')
      queryClient.invalidateQueries({ queryKey: stickerKeys.all })
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to submit request.')),
  })
}

export function useVehicleStickers(params: ListQuery) {
  return useQuery({
    queryKey: stickerKeys.list(params),
    queryFn: () => vehicleStickersService.list(params),
    placeholderData: (previous) => previous,
  })
}

export function useVehicleSticker(id: string | null) {
  return useQuery({
    queryKey: stickerKeys.detail(id ?? ''),
    queryFn: () => vehicleStickersService.get(id as string),
    enabled: Boolean(id),
  })
}

export function useVehicleStickersByVehicle(vehicleId: string | null) {
  return useQuery({
    queryKey: stickerKeys.byVehicle(vehicleId ?? ''),
    queryFn: () => vehicleStickersService.getByVehicle(vehicleId as string),
    enabled: Boolean(vehicleId),
  })
}

export function useCreateSticker(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateStickerInput) => vehicleStickersService.create(input),
    onSuccess: () => {
      toast.success('Sticker application submitted.')
      queryClient.invalidateQueries({ queryKey: stickerKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to create sticker.')),
  })
}

export function useUpdateSticker(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateStickerInput }) =>
      vehicleStickersService.update(id, input),
    onSuccess: () => {
      toast.success('Sticker updated.')
      queryClient.invalidateQueries({ queryKey: stickerKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to update sticker.')),
  })
}

export function useDeleteSticker(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => vehicleStickersService.remove(id),
    onSuccess: () => {
      toast.success('Sticker deleted.')
      queryClient.invalidateQueries({ queryKey: stickerKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to delete sticker.')),
  })
}

export function useVerifySticker(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: VerifyStickerInput }) =>
      vehicleStickersService.verify(id, input),
    onSuccess: () => {
      toast.success('Sticker verification updated.')
      queryClient.invalidateQueries({ queryKey: stickerKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to verify sticker.')),
  })
}

export function useRenewSticker(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RenewStickerInput }) =>
      vehicleStickersService.renew(id, input),
    onSuccess: () => {
      toast.success('Sticker renewed.')
      queryClient.invalidateQueries({ queryKey: stickerKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to renew sticker.')),
  })
}
