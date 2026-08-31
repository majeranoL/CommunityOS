import { useMutation } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import { goodStandingService } from '@/features/good-standing/services/good-standing'
import type {
  GoodStandingQR,
  GoodStandingVerification,
} from '@/features/good-standing/types/good-standing'

export function useGenerateQrPass(onSuccess?: (data: GoodStandingQR) => void) {
  return useMutation({
    mutationFn: (householdId?: string) =>
      goodStandingService.generateQr(householdId),
    onSuccess: (data) => onSuccess?.(data),
    onError: (error) =>
      toast.error(apiErrorMessage(error, 'Failed to generate pass.')),
  })
}

export function useVerifyQrPass(
  onSuccess?: (data: GoodStandingVerification) => void,
) {
  return useMutation({
    mutationFn: (token: string) => goodStandingService.verify(token),
    onSuccess: (data) => onSuccess?.(data),
    onError: (error) =>
      toast.error(apiErrorMessage(error, 'Failed to verify pass.')),
  })
}

export type {
  GoodStandingQR,
  GoodStandingVerification,
} from '@/features/good-standing/types/good-standing'
