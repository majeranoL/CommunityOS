import api from '@/lib/api'
import type { ApiEnvelope, Session, SessionUser } from '@/types/api'

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  firstName: string
  middleName?: string
  lastName: string
  email: string
  password: string
  phoneNumber?: string
  communityId: string
  block?: string
  lot?: string
  unit?: string
  address?: string
}

export const authService = {
  async login(input: LoginInput) {
    const { data } = await api.post<ApiEnvelope<Session>>('/auth/login', input)
    return data.data
  },

  async register(input: RegisterInput) {
    const { data } = await api.post<ApiEnvelope<Session>>('/auth/register', input)
    return data.data
  },

  async me() {
    const { data } = await api.get<ApiEnvelope<SessionUser>>('/auth/me')
    return data.data
  },

  async logout() {
    try {
      await api.post<ApiEnvelope<null>>('/auth/logout')
    } catch {
      // ignore — tokens are cleared locally regardless
    }
  },
}
