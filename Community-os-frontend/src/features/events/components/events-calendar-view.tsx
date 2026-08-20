import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEvents } from '@/features/events/hooks/use-events'
import type { CommunityEvent, EventCategory } from '@/features/events/types/event'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const CATEGORY_COLORS: Record<EventCategory, string> = {
  GENERAL: 'bg-blue-500',
  MEETING: 'bg-purple-500',
  SOCIAL: 'bg-pink-500',
  SPORTS: 'bg-green-500',
  WORKSHOP: 'bg-amber-500',
  FUNDRAISER: 'bg-red-500',
  OTHER: 'bg-gray-500',
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface EventsCalendarViewProps {
  onEventClick: (id: string) => void
}

export function EventsCalendarView({ onEventClick }: EventsCalendarViewProps) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const startOf = new Date(year, month, 1)
  const endOf = new Date(year, month + 1, 0, 23, 59, 59)

  const { data } = useEvents({
    page: 1,
    limit: 100,
    startFrom: startOf.toISOString(),
    startTo: endOf.toISOString(),
  })

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CommunityEvent[]>()
    for (const event of data?.items ?? []) {
      const key = toDateKey(new Date(event.startAt))
      const list = map.get(key) ?? []
      list.push(event)
      map.set(key, list)
    }
    return map
  }, [data?.items])

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfWeek(year, month)

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const prev = () => {
    if (month === 0) {
      setMonth(11)
      setYear((y) => y - 1)
    } else {
      setMonth((m) => m - 1)
    }
  }

  const next = () => {
    if (month === 11) {
      setMonth(0)
      setYear((y) => y + 1)
    } else {
      setMonth((m) => m + 1)
    }
  }

  const monthLabel = startOf.toLocaleDateString('default', { month: 'long', year: 'numeric' })

  const todayKey = toDateKey(new Date())

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon-sm" onClick={prev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-sm font-medium">{monthLabel}</h3>
        <Button variant="ghost" size="icon-sm" onClick={next}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-px rounded-md border bg-border text-xs">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="bg-muted p-1.5 text-center font-medium text-muted-foreground">
            {wd}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="bg-background p-1.5 min-h-16" />
          }
          const key = toDateKey(new Date(year, month, day))
          const dayEvents = eventsByDay.get(key) ?? []
          const isToday = key === todayKey

          return (
            <div key={key} className="bg-background p-1.5 min-h-16">
              <div className={`mb-1 text-right text-xs ${isToday ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                {day}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((evt) => (
                  <button
                    key={evt.id}
                    type="button"
                    onClick={() => onEventClick(evt.id)}
                    className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-accent"
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${CATEGORY_COLORS[evt.category] ?? 'bg-gray-400'}`} />
                    <span className="truncate text-[10px] leading-tight">{evt.title}</span>
                  </button>
                ))}
                {dayEvents.length > 3 ? (
                  <p className="px-1 text-[10px] text-muted-foreground">+{dayEvents.length - 3} more</p>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
          <div key={cat} className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${color}`} />
            {cat.charAt(0) + cat.slice(1).toLowerCase()}
          </div>
        ))}
      </div>
    </div>
  )
}
