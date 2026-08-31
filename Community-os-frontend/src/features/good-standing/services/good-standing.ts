import api from '@/lib/api'
import type { ApiEnvelope } from '@/types/api'
import type {
  GoodStandingQR,
  GoodStandingVerification,
} from '@/features/good-standing/types/good-standing'

export const goodStandingService = {
  async generateQr(householdId?: string) {
    const { data } = await api.post<ApiEnvelope<GoodStandingQR>>(
      '/good-standing/qr',
      householdId ? { householdId } : {},
    )
    return data.data
  },

  async verify(token: string) {
    const { data } = await api.post<ApiEnvelope<GoodStandingVerification>>(
      '/good-standing/verify',
      { token },
    )
    return data.data
  },
}
