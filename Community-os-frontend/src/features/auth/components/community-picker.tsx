import { useEffect, useRef, useState } from 'react'
import { Search, Building2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { CommunitySummary } from '@/types/api'
import { searchCommunities } from '@/features/public/services/communities'
import { cn } from '@/lib/utils'

interface CommunityPickerProps {
  value: string | null
  onChange: (community: CommunitySummary | null) => void
  onBlur?: () => void
  error?: string
}

export function CommunityPicker({ value, onChange, onBlur, error }: CommunityPickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CommunitySummary[]>([])
  const [selected, setSelected] = useState<CommunitySummary | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (value) {
      const community = results.find((item) => item.id === value)
      if (community) setSelected(community)
    } else {
      setSelected(null)
    }
  }, [value, results])

  useEffect(() => {
    if (!open || query.trim() === '') {
      setResults([])
      return
    }

    const id = ++requestIdRef.current
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const items = await searchCommunities(query.trim())
        if (requestIdRef.current === id) setResults(items)
      } catch {
        if (requestIdRef.current === id) setResults([])
      } finally {
        if (requestIdRef.current === id) setLoading(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [query, open])

  if (selected) {
    return (
      <div>
        <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <div className="leading-tight">
              <p className="text-sm font-medium">{selected.displayName}</p>
              <p className="text-xs text-muted-foreground">{selected.slug}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelected(null)
              setQuery('')
              onChange(null)
            }}
          >
            Change
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search your subdivision, village, or HOA…"
          value={query}
          className="pl-9"
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setTimeout(() => setOpen(false), 150)
            onBlur?.()
          }}
          autoComplete="off"
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
          {loading ? (
            <div className="space-y-2 p-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : results.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No communities found. Try a different search.</p>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-1">
              {results.map((community) => (
                <li key={community.id}>
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault()
                      setSelected(community)
                      setQuery('')
                      setOpen(false)
                      onChange(community)
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
                    )}
                  >
                    <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="leading-tight">
                      <p className="font-medium">{community.displayName}</p>
                      <p className="text-xs text-muted-foreground">{community.slug}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {error ? <p className="mt-1 text-sm font-medium text-destructive">{error}</p> : null}
    </div>
  )
}
