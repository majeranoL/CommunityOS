import axios, { AxiosError, AxiosHeaders, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { tokenStore } from './token'

const api: AxiosInstance = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  if (config.data instanceof FormData) {
    config.headers.delete('Content-Type')
  }
  return config
})

const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/me', '/public/']

function isPublicPath(url: string) {
  return PUBLIC_PATHS.some((path) => url.startsWith(path))
}

function isRetryable(config: InternalAxiosRequestConfig) {
  return !(config as { _retried?: boolean })._retried
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
    const status = error.response?.status
    const url = config?.url ?? ''

    if (!config || !status) {
      return Promise.reject(error)
    }

    if (status === 401 && !isPublicPath(url) && isRetryable(config)) {
      config._retried = true

      try {
        const newToken = await tokenStore.refresh()
        if (newToken) {
          config.headers = config.headers ?? new AxiosHeaders()
          config.headers.set('Authorization', `Bearer ${newToken}`)
          return api(config)
        }
      } catch {
        // fall through to reject
      }

      if (!tokenStore.getAccess()) {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'))
      }
    }

    return Promise.reject(error)
  },
)

export function apiErrorMessage(error: unknown, fallback = 'Something went wrong.') {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string | string[] } | undefined)?.message
    if (Array.isArray(message)) return message.join(', ')
    if (typeof message === 'string' && message) return message
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export default api
