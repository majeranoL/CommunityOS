import api from '@/lib/api'
import type {
  ApiEnvelope,
  HouseholdSummary,
  ListQuery,
  Pagination,
} from '@/types/api'
import type {
  CreateHouseholdInput,
  HouseholdDetail,
  HouseholdListItem,
  UpdateHouseholdInput,
  HouseholdAcquisitionRequest,
  HouseholdSearchResult,
} from '@/features/households/types/household'

export interface HouseholdListResult {
  items: HouseholdListItem[]
  pagination?: Pagination
}

export const householdsService = {
  async list(params: ListQuery = {}) {
    const { data } = await api.get<ApiEnvelope<HouseholdListItem[]>>(
      '/households',
      { params },
    )
    return { items: data.data, pagination: data.pagination }
  },

  async get(id: string) {
    const { data } = await api.get<ApiEnvelope<HouseholdDetail>>(
      `/households/${id}`,
    )
    return data.data
  },

  async blockOptions() {
    const { data } = await api.get<ApiEnvelope<string[]>>(
      '/households/block-options',
    )
    return data.data
  },

  async me() {
    const { data } =
      await api.get<ApiEnvelope<HouseholdDetail>>('/households/me')
    return data.data
  },

  async switchHousehold(householdId: string) {
    const { data } = await api.patch<ApiEnvelope<HouseholdSummary>>(
      '/households/switch',
      { householdId },
    )
    return data.data
  },

  async search(search: string) {
    const { data } = await api.get<ApiEnvelope<HouseholdSearchResult[]>>('/households/search', { params: { search } })
    return data.data
  },

  async acquisitionRequests() {
    const { data } = await api.get<ApiEnvelope<HouseholdAcquisitionRequest[]>>('/households/acquisition-requests/mine')
    return data.data
  },

  async requestAcquisition(input: { householdId?: string; requestedBlock?: string; requestedLot?: string; requestedUnit?: string; requestedAddress?: string; notes?: string }) {
    const { data } = await api.post<ApiEnvelope<HouseholdAcquisitionRequest>>('/households/acquisition-requests', input)
    return data.data
  },

  async officerAcquisitionRequests() {
    const { data } = await api.get<ApiEnvelope<HouseholdAcquisitionRequest[]>>('/households/acquisition-requests')
    return data.data
  },

  async reviewAcquisitionRequest(id: string, status: 'APPROVED' | 'REJECTED', reviewNotes?: string) {
    const { data } = await api.put<ApiEnvelope<HouseholdAcquisitionRequest>>(`/households/acquisition-requests/${id}/review`, { status, reviewNotes })
    return data.data
  },

  async create(input: CreateHouseholdInput) {
    const { data } = await api.post<ApiEnvelope<HouseholdListItem>>(
      '/households',
      input,
    )
    return data.data
  },

  async update(id: string, input: UpdateHouseholdInput) {
    const { data } = await api.put<ApiEnvelope<HouseholdListItem>>(
      `/households/${id}`,
      input,
    )
    return data.data
  },

  async remove(id: string) {
    const { data } = await api.delete<ApiEnvelope<null>>(`/households/${id}`)
    return data.data
  },

  async transferOwnership(id: string, newOwnerResidentId: string) {
    const { data } = await api.post<ApiEnvelope<unknown>>(
      `/households/${id}/transfer-ownership`,
      { newOwnerResidentId },
    )
    return data.data
  },

  async deactivate(id: string) {
    const { data } = await api.post<ApiEnvelope<HouseholdListItem>>(
      `/households/${id}/deactivate`,
    )
    return data.data
  },

  async reactivate(id: string) {
    const { data } = await api.post<ApiEnvelope<HouseholdListItem>>(
      `/households/${id}/reactivate`,
    )
    return data.data
  },
}
