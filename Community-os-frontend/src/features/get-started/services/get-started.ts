import api from '@/lib/api'
import type { ApiEnvelope, HoaSignupInput, HoaSignupResult } from '@/types/api'

export async function signupHoa(input: HoaSignupInput) {
  const { data } = await api.post<ApiEnvelope<HoaSignupResult>>('/public/hoa/signup', input)
  return data.data
}
