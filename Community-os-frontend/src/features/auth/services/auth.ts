import api from '@/lib/api'
import type { ApiEnvelope, Session, SessionUser } from '@/types/api'

export interface LoginInput {
  email: string
  password: string
}

export type Gender = 'MALE' | 'FEMALE' | 'OTHER'

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
  gender?: Gender
  otpCode: string
}

export const authService = {
  async login(input: LoginInput) {
    const { data } = await api.post<ApiEnvelope<Session>>('/auth/login', input)
    return data.data
  },

  async sendOtp(input: { email: string; communityId: string }) {
    const { data } = await api.post<ApiEnvelope<SendOtpResult | null>>('/auth/otp/send', input)
    return data
  },

  async register(input: RegisterInput) {
    const { data } = await api.post<ApiEnvelope<null>>('/auth/register', input)
    return data
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

  async forgotPassword(email: string) {
    const { data } = await api.post<ApiEnvelope<null>>('/auth/forgot-password', { email })
    return data
  },

  async resetPassword(token: string, password: string) {
    const { data } = await api.post<ApiEnvelope<null>>('/auth/reset-password', { token, password })
    return data
  },

  async changePassword(input: ChangePasswordInput) {
    const { data } = await api.post<ApiEnvelope<null>>('/auth/change-password', input)
    return data
  },
}

export interface SendOtpResult {
  /** Present only when email delivery is not configured (dev mode). */
  devCode?: string
  expiresInSeconds?: number
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}
