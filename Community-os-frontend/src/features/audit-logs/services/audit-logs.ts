import api from '@/lib/api'
import type { ApiEnvelope, ListQuery, Pagination } from '@/types/api'
import type { AuditLogListItem, AuditSummary } from '@/features/audit-logs/types/audit-log'

export interface AuditLogListResult {
  items: AuditLogListItem[]
  pagination?: Pagination
}

export interface AuditSummaryPayload {
  total: number
  byAction: { action: string; _count: { action: number } }[]
  byEntity: { entity: string; _count: { entity: number } }[]
}

export const auditLogsService = {
  async list(params: ListQuery = {}) {
    const { data } = await api.get<ApiEnvelope<AuditLogListItem[]>>('/audit-logs', { params })
    return { items: data.data, pagination: data.pagination }
  },

  async summary() {
    const { data } = await api.get<ApiEnvelope<AuditSummaryPayload>>('/audit-logs/summary')
    return {
      total: data.data.total,
      byAction: data.data.byAction.map((row) => ({ action: row.action, count: row._count.action })),
      byEntity: data.data.byEntity.map((row) => ({ entity: row.entity, count: row._count.entity })),
    } satisfies AuditSummary
  },

  async purge(keepDays: number) {
    const { data } = await api.delete<ApiEnvelope<{ deleted: number }>>('/audit-logs', {
      params: { keepDays },
    })
    return data.data
  },
}
