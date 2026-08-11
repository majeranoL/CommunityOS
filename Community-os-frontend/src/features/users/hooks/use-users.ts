import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import { usersService, type UserListResult } from '@/features/users/services/users'
import type { CreateRenterInput, CreateUserInput, UpdateUserInput } from '@/features/users/types/user'
import type { ListQuery } from '@/types/api'

export const userKeys = {
  all: ['users'] as const,
  list: (params: ListQuery) => ['users', 'list', params] as const,
  detail: (id: string) => ['users', 'detail', id] as const,
  roles: ['roles'] as const,
}

export function useUsers(params: ListQuery) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => usersService.list(params),
    placeholderData: (previous) => previous,
  })
}

export function useUser(id: string | null) {
  return useQuery({
    queryKey: userKeys.detail(id ?? ''),
    queryFn: () => usersService.get(id as string),
    enabled: Boolean(id),
  })
}

export function useRoles() {
  return useQuery({
    queryKey: userKeys.roles,
    queryFn: () => usersService.roles(),
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateUserInput) => usersService.create(input),
    onSuccess: () => {
      toast.success('User created successfully.')
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to create user.')),
  })
}

export function useCreateRenter(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateRenterInput) => usersService.createRenter(input),
    onSuccess: () => {
      toast.success('Renter account created. They will receive an email to set their password.')
      queryClient.invalidateQueries({ queryKey: userKeys.all })
      queryClient.invalidateQueries({ queryKey: ['households'] })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to create renter account.')),
  })
}

export function useUpdateUser(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) =>
      usersService.update(id, input),
    onSuccess: () => {
      toast.success('User updated successfully.')
      queryClient.invalidateQueries({ queryKey: userKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to update user.')),
  })
}

export function useDeleteUser(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => usersService.remove(id),
    onSuccess: () => {
      toast.success('User removed.')
      queryClient.invalidateQueries({ queryKey: userKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to remove user.')),
  })
}

export type { UserListResult }
