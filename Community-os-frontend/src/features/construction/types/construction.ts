export type ConstructionType = 'CONSTRUCTION' | 'RENOVATION'
export type ConstructionStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CLOSED' | 'CANCELLED'

export interface ConstructionRequirement {
  id: string
  name: string
  description: string | null
  isRequired: boolean
  isActive: boolean
  sortOrder: number
}

export interface ConstructionDocumentInput {
  requirementId?: string
  documentType: string
  originalName: string
  fileId?: string
  fileUrl?: string
}

export interface ConstructionRequest {
  id: string
  requestNumber: string
  type: ConstructionType
  title: string
  description: string
  location: string | null
  contractorName: string | null
  plannedStartDate: string
  plannedEndDate: string
  bondAmount: string | number
  status: ConstructionStatus
  reviewNotes: string | null
  rejectionReason: string | null
  household: { id: string; block: string | null; lot: string | null; unit: string | null }
  documents: Array<ConstructionDocumentInput & { id: string }>
  bond?: { id: string; bondNumber: string; status: string; depositAmount: string | number } | null
}
