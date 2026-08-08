import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useHasPermission } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import { useSettings, useUpdateSettings } from '@/features/settings/hooks/use-settings'
import type { SettingValue } from '@/features/settings/types/setting'

type FieldType = 'text' | 'textarea' | 'email' | 'number' | 'switch' | 'select'

interface FieldDef {
  key: string
  group: string
  label: string
  description?: string
  type: FieldType
  options?: string[]
}

const FIELDS: FieldDef[] = [
  { key: 'communityName', group: 'general', label: 'Community name', type: 'text' },
  { key: 'communityDescription', group: 'general', label: 'Description', type: 'textarea' },
  { key: 'contactEmail', group: 'general', label: 'Contact email', type: 'email' },
  { key: 'contactNumber', group: 'general', label: 'Contact number', type: 'text' },
  { key: 'address', group: 'general', label: 'Address', type: 'text' },
  { key: 'logoUrl', group: 'general', label: 'Logo URL', type: 'text' },
  { key: 'pollReminders', group: 'notifications', label: 'Poll reminders', description: 'Notify members about active polls.', type: 'switch' },
  { key: 'eventReminders', group: 'notifications', label: 'Event reminders', description: 'Send reminders before events.', type: 'switch' },
  { key: 'guestPassAutoApprove', group: 'security', label: 'Auto-approve guest passes', description: 'Approve guest passes without manual review.', type: 'switch' },
  { key: 'registrationMode', group: 'security', label: 'Registration mode', description: 'CLOSED blocks self-registration; admins add members via the Users page.', type: 'select', options: ['OPEN', 'CLOSED'] },
  { key: 'currency', group: 'billing', label: 'Currency', type: 'select', options: ['PHP', 'USD'] },
  { key: 'paymentTermsDays', group: 'billing', label: 'Payment terms (days)', description: 'Days allowed for assessment payments.', type: 'number' },
]

const GROUP_LABELS: Record<string, string> = {
  general: 'General',
  notifications: 'Notifications',
  security: 'Security',
  billing: 'Billing',
}

function FieldInput({
  field,
  value,
  disabled,
  onChange,
}: {
  field: FieldDef
  value: SettingValue | undefined
  disabled: boolean
  onChange: (value: SettingValue) => void
}) {
  const label = (
    <label className="text-sm font-medium" htmlFor={`setting-${field.key}`}>
      {field.label}
    </label>
  )

  const description = field.description ? (
    <p className="text-xs text-muted-foreground">{field.description}</p>
  ) : null

  if (field.type === 'switch') {
    return (
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          {label}
          {description}
        </div>
        <Switch
          id={`setting-${field.key}`}
          checked={value === true}
          onCheckedChange={(checked) => onChange(Boolean(checked))}
          disabled={disabled}
        />
      </div>
    )
  }

  if (field.type === 'select') {
    return (
      <div className="space-y-1.5">
        {label}
        <Select
          value={String(value ?? '')}
          onValueChange={(next) => onChange(next)}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {description}
      </div>
    )
  }

  const textValue = value === undefined || value === null ? '' : String(value)

  return (
    <div className="space-y-1.5">
      {label}
      {field.type === 'textarea' ? (
        <Textarea
          id={`setting-${field.key}`}
          rows={3}
          value={textValue}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          id={`setting-${field.key}`}
          type={field.type}
          value={textValue}
          disabled={disabled}
          onChange={(event) =>
            onChange(field.type === 'number' ? Number(event.target.value) : event.target.value)
          }
        />
      )}
      {description}
    </div>
  )
}

export function CommunitySettings() {
  const canManage = useHasPermission(PERMISSIONS.settingsManage)
  const { data, isLoading } = useSettings()
  const updateSettings = useUpdateSettings()

  const [values, setValues] = useState<Record<string, SettingValue>>({})

  useEffect(() => {
    if (data) {
      setValues((previous) => {
        const next = { ...previous }
        for (const setting of data) {
          next[setting.key] = setting.value as SettingValue
        }
        return next
      })
    }
  }, [data])

  const handleSave = () => {
    const entries = FIELDS.map((field) => ({
      key: field.key,
      value: values[field.key],
      group: field.group,
    }))
    updateSettings.mutate(entries)
  }

  const groups = Array.from(new Set(FIELDS.map((field) => field.group)))

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : (
        <>
          {!canManage ? (
            <p className="text-sm text-muted-foreground">
              You have read-only access to community settings.
            </p>
          ) : null}
          {groups.map((group) => {
            const fields = FIELDS.filter((field) => field.group === group)
            return (
              <Card key={group}>
                <CardHeader>
                  <CardTitle>{GROUP_LABELS[group]}</CardTitle>
                  <CardDescription>Community {GROUP_LABELS[group].toLowerCase()} preferences.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  {fields.map((field) => (
                    <FieldInput
                      key={field.key}
                      field={field}
                      value={values[field.key]}
                      disabled={!canManage}
                      onChange={(value) =>
                        setValues((previous) => ({ ...previous, [field.key]: value }))
                      }
                    />
                  ))}
                </CardContent>
              </Card>
            )
          })}
          {canManage ? (
            <div className="flex justify-end">
              <Button type="button" onClick={handleSave} disabled={updateSettings.isPending}>
                <Save className="h-4 w-4" />
                {updateSettings.isPending ? 'Saving…' : 'Save settings'}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
