import api from '@/lib/api'
import type { ApiEnvelope } from '@/types/api'
import type {
  PaymentMethodConfig,
  PaymentMethodConfigInput,
} from '@/features/finance/types/finance'

export type { PaymentMethodConfig }

export const platformPaymentMethodsService = {
  async listAdmin() {
    const { data } = await api.get<ApiEnvelope<PaymentMethodConfig[]>>('/admin/payment-methods')
    return data.data
  },

  async save(input: PaymentMethodConfigInput) {
    const { data } = await api.post<ApiEnvelope<PaymentMethodConfig>>(
      '/admin/payment-methods',
      input,
    )
    return data.data
  },

  async update(method: string, input: PaymentMethodConfigInput) {
    const { data } = await api.put<ApiEnvelope<PaymentMethodConfig>>(
      `/admin/payment-methods/${method}`,
      input,
    )
    return data.data
  },

  async remove(method: string) {
    const { data } = await api.delete<ApiEnvelope<null>>(`/admin/payment-methods/${method}`)
    return data.data
  },
}