import api from '@/lib/api'
import type { ApiEnvelope, ListQuery, Pagination } from '@/types/api'
import type {
  CreateDocumentInput,
  DocumentListItem,
  UpdateDocumentInput,
  UploadFileResult,
} from '@/features/documents/types/document'

export interface DocumentListResult {
  items: DocumentListItem[]
  pagination?: Pagination
}

export const documentsService = {
  async list(params: ListQuery = {}) {
    const { data } = await api.get<ApiEnvelope<DocumentListItem[]>>('/documents', { params })
    return { items: data.data, pagination: data.pagination }
  },

  async get(id: string) {
    const { data } = await api.get<ApiEnvelope<DocumentListItem>>(`/documents/${id}`)
    return data.data
  },

  async create(input: CreateDocumentInput) {
    const { data } = await api.post<ApiEnvelope<DocumentListItem>>('/documents', input)
    return data.data
  },

  async update(id: string, input: UpdateDocumentInput) {
    const { data } = await api.put<ApiEnvelope<DocumentListItem>>(`/documents/${id}`, input)
    return data.data
  },

  async publish(id: string) {
    const { data } = await api.patch<ApiEnvelope<DocumentListItem>>(`/documents/${id}/publish`)
    return data.data
  },

  async archive(id: string) {
    const { data } = await api.patch<ApiEnvelope<DocumentListItem>>(`/documents/${id}/archive`)
    return data.data
  },

  async remove(id: string) {
    const { data } = await api.delete<ApiEnvelope<null>>(`/documents/${id}`)
    return data.data
  },

  async upload(file: File) {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post<ApiEnvelope<UploadFileResult>>('/uploads', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.data
  },

  async openFile(doc: { fileUrl?: string | null }) {
    const uploadId = doc.fileUrl?.split('/').pop()
    if (!uploadId) return

    const { data } = await api.get<Blob>(`/uploads/${uploadId}`, {
      responseType: 'blob',
    })

    const url = URL.createObjectURL(data)
    window.open(url, '_blank', 'noopener,noreferrer')
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  },
}
