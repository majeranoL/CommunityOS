import { useMutation, useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { authService, type LoginInput, type RegisterInput } from '@/features/auth/services/auth'

function useRedirectAfterAuth() {
  const navigate = useNavigate()
  const location = useLocation()

  return () => {
    const from = (location.state as { from?: string } | null)?.from
    navigate(from && from !== '/login' && from !== '/register' ? from : '/dashboard', {
      replace: true,
    })
  }
}

export function useLogin() {
  const setSession = useAuthStore((state) => state.setSession)
  const redirectAfterAuth = useRedirectAfterAuth()

  return useMutation({
    mutationFn: (input: LoginInput) => authService.login(input),
    onSuccess: (session) => {
      setSession(session)
      toast.success('Welcome back!')
      redirectAfterAuth()
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Invalid email or password.'))
    },
  })
}

export function useRegister() {
  const setSession = useAuthStore((state) => state.setSession)
  const redirectAfterAuth = useRedirectAfterAuth()

  return useMutation({
    mutationFn: (input: RegisterInput) => authService.register(input),
    onSuccess: (session) => {
      setSession(session)
      toast.success('Account created. Welcome to CommunityOS!')
      redirectAfterAuth()
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Registration failed. Please try again.'))
    },
  })
}

export function useSession() {
  const { user, status, setUser, setStatus, clear } = useAuthStore()

  useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      setStatus('loading')
      try {
        const current = await authService.me()
        setUser(current)
        return current
      } catch {
        clear()
        throw new Error('Session expired')
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  return { user, status }
}
