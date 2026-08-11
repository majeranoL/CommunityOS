import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

import type { Session, SessionUser } from '@/types/api'

const { toastMock } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/features/auth/services/auth', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
    me: vi.fn(),
    logout: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  },
}))

vi.mock('@/lib/token', () => ({
  tokenStore: {
    getAccess: vi.fn(),
    set: vi.fn(),
    clear: vi.fn(),
    refresh: vi.fn(),
    ensureAccessToken: vi.fn(),
  },
}))

vi.mock('@/components/ui/sonner', () => ({
  toast: toastMock,
}))

import { authService } from '@/features/auth/services/auth'
import { tokenStore } from '@/lib/token'
import { useLogin, useRegister, useSession } from '@/features/auth/hooks/use-auth'
import { useAuthStore } from '@/store/auth-store'

const user: SessionUser = {
  id: 'user-1',
  referenceNumber: 'USR-000001',
  firstName: 'Ana',
  middleName: null,
  lastName: 'Doe',
  email: 'ana@example.com',
  phoneNumber: null,
  avatarUrl: null,
  isPlatformAdmin: false,
  community: { id: 'c1', code: 'C1', slug: 'c1', displayName: 'Test HOA' },
  resident: null,
  roles: ['President'],
  permissions: ['event.view'],
}

const session: Session = { accessToken: 'token-123', user }

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function createWrapper() {
  const queryClient = makeQueryClient()
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

function createRouterWrapper() {
  const queryClient = makeQueryClient()
  let pathname = ''

  function LocationProbe() {
    pathname = useLocation().pathname
    return null
  }

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={['/login']}>
      <QueryClientProvider client={queryClient}>
        <LocationProbe />
        {children}
      </QueryClientProvider>
    </MemoryRouter>
  )

  return { Wrapper, getPathname: () => pathname }
}

beforeEach(() => {
  useAuthStore.setState({ user: null, status: 'idle' })
  vi.mocked(authService.login).mockReset()
  vi.mocked(authService.register).mockReset()
  vi.mocked(authService.me).mockReset()
  vi.mocked(tokenStore.ensureAccessToken).mockReset()
  toastMock.success.mockClear()
  toastMock.error.mockClear()
})

describe('useSession (session bootstrap)', () => {
  it('loads the current user from /auth/me and marks the session authenticated', async () => {
    vi.mocked(tokenStore.ensureAccessToken).mockResolvedValue('token-123')
    vi.mocked(authService.me).mockResolvedValue(user)

    renderHook(() => useSession(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(useAuthStore.getState().status).toBe('authenticated')
    })

    expect(tokenStore.ensureAccessToken).toHaveBeenCalled()
    expect(authService.me).toHaveBeenCalled()
    expect(useAuthStore.getState().user).toEqual(user)
  })

  it('clears the session when bootstrap fails', async () => {
    vi.mocked(tokenStore.ensureAccessToken).mockRejectedValue(
      new Error('no session'),
    )

    renderHook(() => useSession(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(useAuthStore.getState().status).toBe('unauthenticated')
    })

    expect(useAuthStore.getState().user).toBeNull()
  })
})

describe('useLogin', () => {
  it('stores the session, shows a toast, and redirects to the dashboard', async () => {
    vi.mocked(authService.login).mockResolvedValue(session)
    const { Wrapper, getPathname } = createRouterWrapper()

    const { result } = renderHook(() => useLogin(), { wrapper: Wrapper })

    act(() => {
      result.current.mutate({ email: 'ana@example.com', password: 'Str0ng!Pass' })
    })

    await waitFor(() => {
      expect(useAuthStore.getState().status).toBe('authenticated')
    })

    expect(authService.login).toHaveBeenCalledWith({
      email: 'ana@example.com',
      password: 'Str0ng!Pass',
    })
    expect(toastMock.success).toHaveBeenCalled()
    expect(useAuthStore.getState().user).toEqual(user)
    expect(getPathname()).toBe('/app/dashboard')
  })

  it('shows an error toast on failed login', async () => {
    vi.mocked(authService.login).mockRejectedValue(new Error('Invalid credentials'))
    const { Wrapper } = createRouterWrapper()

    const { result } = renderHook(() => useLogin(), { wrapper: Wrapper })

    act(() => {
      result.current.mutate({ email: 'ana@example.com', password: 'wrong' })
    })

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalled()
    })

    expect(useAuthStore.getState().status).not.toBe('authenticated')
  })
})

describe('useRegister', () => {
  it('shows a success toast and redirects to login after a pending-approval registration', async () => {
    vi.mocked(authService.register).mockResolvedValue({
      success: true,
      message: 'Registration submitted for approval.',
      data: null,
    })
    const { Wrapper, getPathname } = createRouterWrapper()

    const { result } = renderHook(() => useRegister(), { wrapper: Wrapper })

    act(() => {
      result.current.mutate({
        firstName: 'Ana',
        lastName: 'Doe',
        email: 'ana@example.com',
        password: 'Str0ng!Pass',
        communityId: 'c1',
        otpCode: '123456',
        gender: 'FEMALE',
        block: 'B1',
        lot: 'L1',
      })
    })

    await waitFor(() => {
      expect(toastMock.success).toHaveBeenCalled()
    })

    expect(authService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ana@example.com',
        communityId: 'c1',
        otpCode: '123456',
        gender: 'FEMALE',
      }),
    )
    expect(useAuthStore.getState().status).not.toBe('authenticated')
    expect(getPathname()).toBe('/login')
  })
})
