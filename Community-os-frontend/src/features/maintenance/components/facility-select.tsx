import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFacilities } from '@/features/facilities/hooks/use-facilities'
import { toTitleCase } from '@/lib/format'

interface FacilitySelectProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function FacilitySelect({ value, onChange, disabled }: FacilitySelectProps) {
  const { data } = useFacilities({ page: 1, limit: 100 })

  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Select a facility" />
      </SelectTrigger>
      <SelectContent>
        {data?.items.map((facility) => (
          <SelectItem
            key={facility.id}
            value={facility.id}
            disabled={facility.status === 'CLOSED'}
          >
            {facility.name} · {toTitleCase(facility.type)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
