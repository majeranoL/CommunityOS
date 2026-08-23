import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

const { toastMock } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/features/settings/services/settings', () => ({
  settingsService: {
    all: vi.fn(),
    updateMany: vi.fn(),
  },
}))

vi.mock('@/features/auth/services/auth', () => ({
  authService: {
    me: vi.fn(),
  },
}))

vi.mock('@/components/ui/sonner', () => ({
  toast: toastMock,
}))

import { settingsService } from '@/features/settings/services/settings'
import { authService } from '@/features/auth/services/auth'
import { useUpdateSettings } from '@/features/settings/hooks/use-settings'
import type { UpdateSettingEntry } from '@/features/settings/types/setting'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

beforeEach(() => {
  vi.mocked(settingsService.updateMany).mockReset()
  vi.mocked(authService.me).mockReset()
  toastMock.success.mockClear()
  toastMock.error.mockClear()
})

describe('useUpdateSettings (settings save)', () => {
  it('persists the settings and confirms with a toast', async () => {
    vi.mocked(settingsService.updateMany).mockResolvedValue([])
    vi.mocked(authService.me).mockResolvedValue({
      id: 'user-1',
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      roles: [],
      permissions: [],
      community: { id: 'community-1', name: 'Sunrise Estates' },
    } as never)
    const onSuccess = vi.fn()
    const wrapper = createWrapper()

    const { result } = renderHook(() => useUpdateSettings(onSuccess), {
      wrapper,
    })

    const entries: UpdateSettingEntry[] = [
      { key: 'communityName', value: 'Sunrise Estates', group: 'general' },
      { key: 'pollReminders', value: false, group: 'general' },
    ]

    act(() => {
      result.current.mutate(entries)
    })

    await waitFor(() => {
      expect(settingsService.updateMany).toHaveBeenCalledWith(entries)
    })

    await waitFor(() => {
      expect(toastMock.success).toHaveBeenCalledWith('Community settings saved.')
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('shows an error toast when saving fails', async () => {
    vi.mocked(settingsService.updateMany).mockRejectedValue(
      new Error('Network error'),
    )
    const wrapper = createWrapper()

    const { result } = renderHook(() => useUpdateSettings(), { wrapper })

    act(() => {
      result.current.mutate([{ key: 'communityName', value: 'X', group: 'general' }])
    })

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalled()
    })

    expect(toastMock.error).toHaveBeenCalledWith('Network error')
    expect(toastMock.success).not.toHaveBeenCalled()
  })
})
