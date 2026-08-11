import { useMutation, useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import { tokenStore } from '@/lib/token'
import { useAuthStore } from '@/store/auth-store'
import { authService, type LoginInput, type RegisterInput, type ChangePasswordInput } from '@/features/auth/services/auth'
function useRedirectAfterAuth() {
  const navigate = useNavigate()
  const location = useLocation()

  return () => {
    const user = useAuthStore.getState().user
    const from = (location.state as { from?: string } | null)?.from
    const isPlatformAdmin = user?.isPlatformAdmin === true
    const destination = isPlatformAdmin ? '/admin' : from || '/app/dashboard'
    navigate(destination, { replace: true })
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
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (input: RegisterInput) => authService.register(input),
    onSuccess: () => {
      toast.success('Registration submitted for approval. Check your email.')
      navigate('/login')
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Registration failed. Please try again.'))
    },
  })
}

export function useSendOtp() {
  return useMutation({
    mutationFn: (input: { email: string; communityId: string }) => authService.sendOtp(input),
    onSuccess: (data) => {
      if (data.data?.devCode) {
        toast.success(`Email delivery is off — your code: ${data.data.devCode}`)
      } else {
        toast.success('Verification code sent to your email.')
      }
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Could not send the verification code.'))
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => authService.changePassword(input),
    onSuccess: () => {
      toast.success('Password changed successfully.')
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Could not change your password.'))
    },
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authService.forgotPassword(email),
    onSuccess: () => {
      toast.success('If an account exists for that email, a reset link was sent.')
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Something went wrong. Please try again.'))
    },
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      authService.resetPassword(token, password),
    onSuccess: () => {
      toast.success('Password reset. You can now sign in.')
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Invalid or expired reset link.'))
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
        await tokenStore.ensureAccessToken()
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
