import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useViewParam(onView: (id: string) => void) {
  const [searchParams, setSearchParams] = useSearchParams()
  const view = searchParams.get('view')

  useEffect(() => {
    if (!view) return
    onView(view)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('view')
        return next
      },
      { replace: true },
    )
  }, [view, onView, setSearchParams])
}
