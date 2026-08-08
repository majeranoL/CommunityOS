import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import { permissionsService, rolesService, type RoleListResult } from '@/features/roles/services/roles'
import type {
  AssignPermissionsInput,
  CreateRoleInput,
  UpdateRoleInput,
} from '@/features/roles/types/role'
import type { ListQuery } from '@/types/api'

export { useRoles } from '@/features/users/hooks/use-users'

export const roleKeys = {
  all: ['roles'] as const,
  list: (params: ListQuery) => ['roles', 'list', params] as const,
  detail: (id: string) => ['roles', 'detail', id] as const,
  permissions: ['roles', 'permissions'] as const,
}

export function useRolesList(params: ListQuery) {
  return useQuery({
    queryKey: roleKeys.list(params),
    queryFn: () => rolesService.list(params),
    placeholderData: (previous) => previous,
  })
}

export function useRole(id: string | null) {
  return useQuery({
    queryKey: roleKeys.detail(id ?? ''),
    queryFn: () => rolesService.get(id as string),
    enabled: Boolean(id),
  })
}

export function useAllPermissions() {
  return useQuery({
    queryKey: roleKeys.permissions,
    queryFn: () => permissionsService.all(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateRole(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateRoleInput) => rolesService.create(input),
    onSuccess: () => {
      toast.success('Role created.')
      queryClient.invalidateQueries({ queryKey: roleKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to create role.')),
  })
}

export function useUpdateRole(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRoleInput }) =>
      rolesService.update(id, input),
    onSuccess: () => {
      toast.success('Role updated.')
      queryClient.invalidateQueries({ queryKey: roleKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to update role.')),
  })
}

export function useAssignRolePermissions(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AssignPermissionsInput }) =>
      rolesService.assignPermissions(id, input),
    onSuccess: () => {
      toast.success('Permissions saved.')
      queryClient.invalidateQueries({ queryKey: roleKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to save permissions.')),
  })
}

export function useDeleteRole(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => rolesService.remove(id),
    onSuccess: () => {
      toast.success('Role deleted.')
      queryClient.invalidateQueries({ queryKey: roleKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to delete role.')),
  })
}

export type { RoleListResult }
