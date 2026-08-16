import api from '@/lib/api'
import type { ApiEnvelope, ListQuery, Pagination } from '@/types/api'
import type {
  CreatePetInput,
  PetListItem,
  UpdatePetInput,
  VerifyPetInput,
} from '@/features/pets/types/pet'

export interface PetListResult {
  items: PetListItem[]
  pagination?: Pagination
}

export const petsService = {
  async list(params: ListQuery = {}) {
    const { data } = await api.get<ApiEnvelope<PetListItem[]>>('/pets', { params })
    return { items: data.data, pagination: data.pagination }
  },

  async get(id: string) {
    const { data } = await api.get<ApiEnvelope<PetListItem>>(`/pets/${id}`)
    return data.data
  },

  async create(input: CreatePetInput) {
    const { data } = await api.post<ApiEnvelope<PetListItem>>('/pets', input)
    return data.data
  },

  async update(id: string, input: UpdatePetInput) {
    const { data } = await api.put<ApiEnvelope<PetListItem>>(`/pets/${id}`, input)
    return data.data
  },

  async remove(id: string) {
    const { data } = await api.delete<ApiEnvelope<null>>(`/pets/${id}`)
    return data.data
  },

  async verify(id: string, input: VerifyPetInput) {
    const { data } = await api.post<ApiEnvelope<PetListItem>>(`/pets/${id}/verify`, input)
    return data.data
  },

  async deactivate(id: string) {
    const { data } = await api.post<ApiEnvelope<PetListItem>>(`/pets/${id}/deactivate`)
    return data.data
  },

  async revalidate(id: string) {
    const { data } = await api.post<ApiEnvelope<PetListItem>>(`/pets/${id}/revalidate`)
    return data.data
  },
}
