import { useEffect, useState } from 'react'

import api from '@/lib/api'

/**
 * Resolves an app-managed upload reference (`/api/uploads/:id`) into a
 * short-lived object URL by fetching it with the caller's credentials,
 * since upload endpoints are not publicly accessible. External HTTP(S)
 * sources are passed through untouched.
 */
export function useSecureImageUrl(src?: string | null) {
  const [resolved, setResolved] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!src || !src.startsWith('/')) return

    const uploadId = src.split('/').pop()
    if (!uploadId) return

    let active = true
    let objectUrl: string | undefined

    api
      .get<Blob>(`/uploads/${uploadId}`, { responseType: 'blob' })
      .then(({ data }) => {
        if (!active) return
        objectUrl = URL.createObjectURL(data)
        setResolved(objectUrl)
      })
      .catch(() => {
        if (active) setResolved(undefined)
      })

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src])

  if (!src || !src.startsWith('/')) return src || undefined
  return resolved
}

interface SecureImageProps {
  src?: string | null
  alt?: string
  className?: string
}

/** Drop-in replacement for raw <img> tags pointing at protected uploads. */
export function SecureImage({ src, alt, className }: SecureImageProps) {
  const resolved = useSecureImageUrl(src)

  if (!resolved) return null

  return <img src={resolved} alt={alt ?? ''} className={className} loading="lazy" />
}
