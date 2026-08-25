import api from '@/lib/api'
import type { ApiEnvelope } from '@/types/api'
import type {
  BorrowItemInput,
  FacilityItem,
  FacilityItemInput,
  FacilityItemLoan,
} from '@/features/facilities/types/facility-item'

export interface ItemLoanListParams {
  status?: string
  mine?: boolean
}

export const facilityItemsService = {
  async listItems() {
    const { data } = await api.get<ApiEnvelope<FacilityItem[]>>('/facilities/items')
    return data.data
  },

  async createItem(input: FacilityItemInput) {
    const { data } = await api.post<ApiEnvelope<FacilityItem>>('/facilities/items', input)
    return data.data
  },

  async updateItem(id: string, input: Partial<FacilityItemInput>) {
    const { data } = await api.put<ApiEnvelope<FacilityItem>>(`/facilities/items/${id}`, input)
    return data.data
  },

  async removeItem(id: string) {
    const { data } = await api.delete<ApiEnvelope<null>>(`/facilities/items/${id}`)
    return data.data
  },

  async listLoans(params: ItemLoanListParams = {}) {
    const { data } = await api.get<ApiEnvelope<FacilityItemLoan[]>>('/facilities/items/loans', {
      params: {
        status: params.status,
        mine: params.mine === true ? 'true' : undefined,
      },
    })
    return data.data
  },

  async borrow(itemId: string, input: BorrowItemInput) {
    const { data } = await api.post<ApiEnvelope<FacilityItemLoan>>(
      `/facilities/items/${itemId}/loans`,
      input,
    )
    return data.data
  },

  async approveLoan(loanId: string) {
    const { data } = await api.patch<ApiEnvelope<FacilityItemLoan>>(
      `/facilities/items/loans/${loanId}/approve`,
    )
    return data.data
  },

  async rejectLoan(loanId: string, reason?: string) {
    const { data } = await api.patch<ApiEnvelope<FacilityItemLoan>>(
      `/facilities/items/loans/${loanId}/reject`,
      { reason },
    )
    return data.data
  },

  async returnLoan(loanId: string, remarks?: string) {
    const { data } = await api.patch<ApiEnvelope<FacilityItemLoan>>(
      `/facilities/items/loans/${loanId}/return`,
      { remarks },
    )
    return data.data
  },

  async cancelLoan(loanId: string) {
    const { data } = await api.delete<ApiEnvelope<FacilityItemLoan>>(
      `/facilities/items/loans/${loanId}`,
    )
    return data.data
  },
}
