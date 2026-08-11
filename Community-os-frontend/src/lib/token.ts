import axios from 'axios'

let accessToken: string | null = null

let refreshPromise: Promise<string | null> | null = null

async function refreshTokens(): Promise<string | null> {
  try {
    const response = await axios.post(
      '/api/auth/refresh',
      {},
      { withCredentials: true },
    )
    const data = response.data?.data
    if (data?.accessToken) {
      accessToken = data.accessToken as string
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
}

export const tokenStore = {
  getAccess: () => accessToken,
  set: (access: string) => {
    accessToken = access
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
