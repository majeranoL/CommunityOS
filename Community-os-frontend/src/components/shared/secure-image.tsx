import { useEffect, useState } from 'react'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
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

interface SecureVideoProps {
  src?: string | null
  className?: string
  controls?: boolean
}

export function SecureVideo({ src, className, controls = true }: SecureVideoProps) {
  const resolved = useSecureImageUrl(src)

  if (!resolved) return null

  return <video src={resolved} className={className} controls={controls} preload="metadata" />
}

interface SecureMediaPreviewProps {
  src?: string | null
  alt?: string
  fileName?: string | null
  mediaType?: 'image' | 'video'
  className?: string
}

/**
 * Displays protected media inline and opens a larger viewer when selected.
 * The object URL is created with the current user's authenticated session.
 */
export function SecureMediaPreview({
  src,
  alt = 'Attached media',
  fileName,
  mediaType = 'image',
  className,
}: SecureMediaPreviewProps) {
  const resolved = useSecureImageUrl(src)
  const [open, setOpen] = useState(false)

  if (!resolved) return null

  return (
    <>
      <button
        type="button"
        className="block h-full w-full cursor-zoom-in rounded-md text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        onClick={() => setOpen(true)}
        aria-label={`View ${fileName || alt}`}
        title="Click to view"
      >
        {mediaType === 'video' ? (
          <video src={resolved} className={className} controls preload="metadata" />
        ) : (
          <img src={resolved} alt={alt} className={className} loading="lazy" />
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[95vh] max-w-5xl p-2 sm:p-4">
          <DialogTitle className="sr-only">{fileName || alt}</DialogTitle>
          {mediaType === 'video' ? (
            <video src={resolved} className="max-h-[85vh] w-full object-contain" controls autoPlay />
          ) : (
            <img src={resolved} alt={alt} className="max-h-[85vh] w-full object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
