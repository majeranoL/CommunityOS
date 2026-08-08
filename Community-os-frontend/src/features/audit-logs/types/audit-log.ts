export interface AuditLogActorRef {
  id: string
  firstName: string
  lastName: string
}

export interface AuditLogListItem {
  id: string
  actorId: string | null
  actor: AuditLogActorRef | null
  action: string
  entity: string
  entityId: string | null
  before: unknown
  after: unknown
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

export interface AuditSummary {
  total: number
  byAction: { action: string; count: number }[]
  byEntity: { entity: string; count: number }[]
}
