export type DocumentCategory = 'POLICY' | 'MINUTES' | 'FINANCIAL' | 'NOTICE' | 'FORM' | 'OTHER'
export type DocumentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export interface UserRef {
  id: string
  firstName: string
  lastName: string
}

export interface DocumentListItem {
  id: string
  title: string
  description: string | null
  category: DocumentCategory
  fileUrl: string
  fileName: string
  fileSize: number | null
  mimeType: string | null
  status: DocumentStatus
  uploadedById: string
  uploadedBy: UserRef
  createdAt: string
  updatedAt: string
}

export interface CreateDocumentInput {
  title: string
  description?: string
  category?: DocumentCategory
  fileUrl: string
  fileName?: string
  fileSize?: number
  mimeType?: string
  status?: DocumentStatus
}

export interface UpdateDocumentInput {
  title?: string
  description?: string | null
  category?: DocumentCategory
  fileUrl?: string
  fileName?: string | null
  fileSize?: number | null
  mimeType?: string | null
  status?: DocumentStatus
}

export interface UploadFileResult {
  url: string
  filename: string
  originalName: string
  mimetype: string
  size: number
}
