import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { signupHoa } from '@/features/get-started/services/get-started'
import type { HoaSignupInput } from '@/types/api'

export function useSignupHoa() {
  const setSession = useAuthStore((state) => state.setSession)
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (input: HoaSignupInput) => signupHoa(input),
    onSuccess: (result) => {
      setSession(result.session)
      toast.success('Your community is ready!')
      navigate('/app/dashboard', { replace: true })
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Sign up failed. Please try again.'))
    },
  })
}
