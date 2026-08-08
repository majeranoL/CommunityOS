import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import { auditLogsService } from '@/features/audit-logs/services/audit-logs'
import type { ListQuery } from '@/types/api'

export const auditLogKeys = {
  all: ['audit-logs'] as const,
  list: (params: ListQuery) => ['audit-logs', 'list', params] as const,
  summary: ['audit-logs', 'summary'] as const,
}

export function useAuditLogs(params: ListQuery) {
  return useQuery({
    queryKey: auditLogKeys.list(params),
    queryFn: () => auditLogsService.list(params),
    placeholderData: (previous) => previous,
  })
}

export function useAuditSummary() {
  return useQuery({
    queryKey: auditLogKeys.summary,
    queryFn: () => auditLogsService.summary(),
    placeholderData: (previous) => previous,
  })
}

export function usePurgeAuditLogs(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (keepDays: number) => auditLogsService.purge(keepDays),
    onSuccess: (result) => {
      toast.success(`Purged ${result.deleted} audit log entries.`)
      queryClient.invalidateQueries({ queryKey: auditLogKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to purge audit logs.')),
  })
}
