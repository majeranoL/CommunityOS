import api from '@/lib/api'
import type { ApiEnvelope, ListQuery, Pagination } from '@/types/api'
import type {
  Complaint,
  ComplaintListItem,
  CreateComplaintInput,
  UpdateComplaintInput,
} from '@/features/complaints/types/complaint'

export interface ComplaintListResult {
  items: ComplaintListItem[]
  pagination?: Pagination
}

export const complaintsService = {
  async list(params: ListQuery = {}) {
    const { data } = await api.get<ApiEnvelope<ComplaintListItem[]>>('/complaints', { params })
    return { items: data.data, pagination: data.pagination }
  },

  async get(id: string) {
    const { data } = await api.get<ApiEnvelope<Complaint>>(`/complaints/${id}`)
    return data.data
  },

  async create(input: CreateComplaintInput) {
    const { data } = await api.post<ApiEnvelope<Complaint>>('/complaints', input)
    return data.data
  },

  async update(id: string, input: UpdateComplaintInput) {
    const { data } = await api.put<ApiEnvelope<Complaint>>(`/complaints/${id}`, input)
    return data.data
  },

  async remove(id: string) {
    const { data } = await api.delete<ApiEnvelope<null>>(`/complaints/${id}`)
    return data.data
  },

  async assign(id: string, assignedToId: string) {
    const { data } = await api.put<ApiEnvelope<Complaint>>(`/complaints/${id}/assign`, { assignedToId })
    return data.data
  },

  async resolve(id: string, resolutionRemarks?: string) {
    const { data } = await api.put<ApiEnvelope<Complaint>>(`/complaints/${id}/resolve`, {
      resolutionRemarks: resolutionRemarks || undefined,
    })
    return data.data
  },

  async close(id: string) {
    const { data } = await api.put<ApiEnvelope<Complaint>>(`/complaints/${id}/close`)
    return data.data
  },
}
