import * as React from 'react'
import { Calendar as CalendarIcon } from 'lucide-react'
import { format, startOfDay } from 'date-fns'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface DateTimePickerProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'onChange'> {
  value: string
  onChange: (value: string) => void
  minDate?: Date
  placeholder?: string
}

function parseLocal(value: string | undefined | null): Date | undefined {
  if (!value) return undefined
  const [datePart, timePart] = value.split('T')
  if (!datePart) return undefined
  const [y, m, d] = datePart.split('-').map(Number)
  if (!y || !m || !d) return undefined
  const [hh, mm] = timePart ? timePart.split(':').map(Number) : [0, 0]
  return new Date(y, m - 1, d, hh || 0, mm || 0)
}

function toLocal(value: Date): string {
  return format(value, "yyyy-MM-dd'T'HH:mm")
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)

export const DateTimePicker = React.forwardRef<HTMLButtonElement, DateTimePickerProps>(
  (
    {
      value,
      onChange,
      minDate,
      placeholder = 'Pick a date and time',
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false)
    const date = parseLocal(value)

    const commit = (next: Date) => {
      if (minDate && next < minDate) {
        next = new Date(Math.ceil(minDate.getTime() / (5 * 60 * 1000)) * (5 * 60 * 1000))
      }
      onChange(toLocal(next))
    }

    const handleDateSelect = (selected: Date | undefined) => {
      if (!selected) return
      const base = date ?? new Date()
      commit(
        new Date(
          selected.getFullYear(),
          selected.getMonth(),
          selected.getDate(),
          base.getHours(),
          base.getMinutes(),
        ),
      )
    }

    const handleHourChange = (hour: string) => {
      if (!date) return
      const next = new Date(date)
      next.setHours(Number(hour))
      commit(next)
    }

    const handleMinuteChange = (minute: string) => {
      if (!date) return
      const next = new Date(date)
      next.setMinutes(Number(minute))
      commit(next)
    }

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              'w-full justify-start text-left font-normal',
              !date && 'text-muted-foreground',
              className,
            )}
            {...props}
          >
            <CalendarIcon className="h-4 w-4 shrink-0 opacity-50" />
            {date ? format(date, 'MMM d, yyyy · h:mm a') : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            disabled={minDate ? { before: startOfDay(minDate) } : undefined}
          />
          <div className="flex items-center gap-2 border-t p-3">
            <span className="text-sm font-medium">Time</span>
            <Select
              value={date ? String(date.getHours()).padStart(2, '0') : ''}
              onValueChange={handleHourChange}
              disabled={!date}
            >
              <SelectTrigger className="h-8 w-[72px]">
                <SelectValue placeholder="HH" />
              </SelectTrigger>
              <SelectContent>
                {HOURS.map((hour) => (
                  <SelectItem key={hour} value={String(hour).padStart(2, '0')}>
                    {String(hour).padStart(2, '0')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">:</span>
            <Select
              value={date ? String(date.getMinutes()).padStart(2, '0') : ''}
              onValueChange={handleMinuteChange}
              disabled={!date}
            >
              <SelectTrigger className="h-8 w-[72px]">
                <SelectValue placeholder="MM" />
              </SelectTrigger>
              <SelectContent>
                {MINUTES.map((minute) => (
                  <SelectItem key={minute} value={String(minute).padStart(2, '0')}>
                    {String(minute).padStart(2, '0')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PopoverContent>
      </Popover>
    )
  },
)
DateTimePicker.displayName = 'DateTimePicker'
