import api from '@/lib/api'
import type { ApiEnvelope } from '@/types/api'
import type {
  ConstructionDocumentInput,
  ConstructionRequirement,
  ConstructionRequest,
  ConstructionStatus,
  ConstructionType,
} from '@/features/construction/types/construction'

export interface CreateConstructionInput {
  householdId: string
  type: ConstructionType
  title: string
  description: string
  location?: string
  contractorName?: string
  plannedStartDate: string
  plannedEndDate: string
  bondAmount?: number
  documents: ConstructionDocumentInput[]
}

export const constructionService = {
  async list(query?: { status?: ConstructionStatus }) {
    const { data } = await api.get<ApiEnvelope<ConstructionRequest[]>>('/construction-requests', { params: query })
    return data.data
  },
  async requirements() {
    const { data } = await api.get<ApiEnvelope<ConstructionRequirement[]>>('/construction-requests/requirements')
    return data.data
  },
  async createRequirement(input: { name: string; description?: string; isRequired?: boolean }) {
    const { data } = await api.post<ApiEnvelope<ConstructionRequirement>>('/construction-requests/requirements', input)
    return data.data
  },
  async create(input: CreateConstructionInput) {
    const { data } = await api.post<ApiEnvelope<ConstructionRequest>>('/construction-requests', input)
    return data.data
  },
  async review(id: string, status: 'APPROVED' | 'REJECTED', notes?: string) {
    const { data } = await api.put<ApiEnvelope<ConstructionRequest>>(`/construction-requests/${id}/review`, { status, notes })
    return data.data
  },
  async complete(id: string) {
    const { data } = await api.put<ApiEnvelope<ConstructionRequest>>(`/construction-requests/${id}/complete`)
    return data.data
  },
  async close(id: string) {
    const { data } = await api.put<ApiEnvelope<ConstructionRequest>>(`/construction-requests/${id}/close`)
    return data.data
  },
  async cancel(id: string) {
    const { data } = await api.delete<ApiEnvelope<ConstructionRequest>>(`/construction-requests/${id}`)
    return data.data
  },
  async resolveBond(id: string, status: 'REFUNDED' | 'FORFEITED', notes: string) {
    const { data } = await api.put<ApiEnvelope<unknown>>(`/construction-requests/bonds/${id}/resolve`, { status, notes })
    return data.data
  },
}
