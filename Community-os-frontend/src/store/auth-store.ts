import { create } from 'zustand'
import { tokenStore } from '@/lib/token'
import type { SessionUser } from '@/types/api'

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

type AuthState = {
  user: SessionUser | null
  status: AuthStatus
  setSession: (session: { user: SessionUser; accessToken: string; refreshToken: string }) => void
  setUser: (user: SessionUser) => void
  setStatus: (status: AuthStatus) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'idle',

  setSession: ({ user, accessToken, refreshToken }) => {
    tokenStore.set(accessToken, refreshToken)
    set({ user, status: 'authenticated' })
  },

  setUser: (user) => set({ user, status: 'authenticated' }),

  setStatus: (status) => set({ status }),

  clear: () => {
    tokenStore.clear()
    set({ user: null, status: 'unauthenticated' })
  },
}))

export function useHasPermission(permission: string) {
  const user = useAuthStore((state) => state.user)
  if (!user) return false
  return user.permissions.includes(permission)
}

export function useHasAnyPermission(permissions: string[]) {
  const user = useAuthStore((state) => state.user)
  if (!user) return false
  return permissions.some((p) => user.permissions.includes(p))
}
