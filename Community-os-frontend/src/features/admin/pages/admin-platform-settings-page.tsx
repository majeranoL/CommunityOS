import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/page-header'
import { usePlatformSettings, useUpdatePlatformSettings } from '@/features/admin/hooks/use-platform-settings'
import type { PlatformSettingValue } from '@/features/admin/types/platform-settings'

interface FieldDef {
  key: string
  label: string
  description?: string
  type: 'text' | 'email'
}

const FIELDS: FieldDef[] = [
  { key: 'platformName', label: 'Platform name', description: 'Display name shown across CommunityOS.', type: 'text' },
  { key: 'supportEmail', label: 'Support email', description: 'Contact address surfaced to users and communities.', type: 'email' },
]

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef
  value: PlatformSettingValue | undefined
  onChange: (value: PlatformSettingValue) => void
}) {
  const textValue = value === undefined || value === null ? '' : String(value)

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium" htmlFor={`setting-${field.key}`}>
        {field.label}
      </label>
      <Input
        id={`setting-${field.key}`}
        type={field.type}
        value={textValue}
        onChange={(event) => onChange(event.target.value)}
      />
      {field.description ? <p className="text-xs text-muted-foreground">{field.description}</p> : null}
    </div>
  )
}

export default function AdminPlatformSettingsPage() {
  const { data, isLoading } = usePlatformSettings()
  const updateSettings = useUpdatePlatformSettings()

  const [values, setValues] = useState<Record<string, PlatformSettingValue>>({})

  useEffect(() => {
    if (data) {
      setValues((previous) => {
        const next = { ...previous }
        for (const setting of data) {
          next[setting.key] = setting.value as PlatformSettingValue
        }
        return next
      })
    }
  }, [data])

  const handleSave = () => {
    const entries = FIELDS.map((field) => ({
      key: field.key,
      value: values[field.key],
      group: 'general',
    }))
    updateSettings.mutate(entries)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform settings"
        description="Global configuration that applies across all communities on CommunityOS."
      />

      {isLoading ? (
        <Skeleton className="h-56 w-full" />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
              <CardDescription>Platform-wide general preferences.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {FIELDS.map((field) => (
                <FieldInput
                  key={field.key}
                  field={field}
                  value={values[field.key]}
                  onChange={(value) =>
                    setValues((previous) => ({ ...previous, [field.key]: value }))
                  }
                />
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="button" onClick={handleSave} disabled={updateSettings.isPending}>
              <Save className="h-4 w-4" />
              {updateSettings.isPending ? 'Saving…' : 'Save settings'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
