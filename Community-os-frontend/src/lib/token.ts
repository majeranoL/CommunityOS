import axios from 'axios'

const REFRESH_KEY = 'communityos_refresh'

let accessToken: string | null = null

let refreshPromise: Promise<string | null> | null = null

async function refreshTokens(): Promise<string | null> {
  const refresh = localStorage.getItem(REFRESH_KEY)
  if (!refresh) return null

  try {
    const response = await axios.post('/api/auth/refresh', { refreshToken: refresh })
    const data = response.data?.data
    if (data?.accessToken && data?.refreshToken) {
      accessToken = data.accessToken as string
      localStorage.setItem(REFRESH_KEY, data.refreshToken)
      return accessToken
    }
    return null
  } catch {
    clearTokens()
    return null
  }
}

function clearTokens() {
  accessToken = null
  localStorage.removeItem(REFRESH_KEY)
}

export const tokenStore = {
  getAccess: () => accessToken,
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (access: string, refresh: string) => {
    accessToken = access
    localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear: () => {
    clearTokens()
  },
  async refresh(): Promise<string | null> {
    refreshPromise = refreshPromise ?? refreshTokens()
    try {
      return await refreshPromise
    } finally {
      refreshPromise = null
    }
  },
  async ensureAccessToken(): Promise<string | null> {
    if (accessToken) return accessToken
    return tokenStore.refresh()
  },
}
