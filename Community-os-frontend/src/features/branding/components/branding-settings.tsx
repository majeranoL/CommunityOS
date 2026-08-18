import { useState, useEffect } from 'react'
import { Save, RotateCcw, Palette } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { brandingService } from '@/features/branding/services/branding'
import { brandingKeys } from '@/features/branding/hooks/use-branding'
import type { BrandingData } from '@/features/branding/types/branding'

const PRESETS = [
  { name: 'Default', primary: '#6366f1', accent: '#e0e7ff', sidebar: '#f8fafc' },
  { name: 'Ocean', primary: '#0ea5e9', accent: '#e0f2fe', sidebar: '#f0f9ff' },
  { name: 'Forest', primary: '#22c55e', accent: '#dcfce7', sidebar: '#f0fdf4' },
  { name: 'Sunset', primary: '#f97316', accent: '#ffedd5', sidebar: '#fff7ed' },
  { name: 'Royal', primary: '#8b5cf6', accent: '#ede9fe', sidebar: '#f5f3ff' },
  { name: 'Corporate', primary: '#475569', accent: '#f1f5f9', sidebar: '#f8fafc' },
  { name: 'Rose', primary: '#f43f5e', accent: '#ffe4e6', sidebar: '#fff1f2' },
  { name: 'Teal', primary: '#14b8a6', accent: '#ccfbf1', sidebar: '#f0fdfa' },
]

interface BrandingSettingsProps {
  data: BrandingData
}

export function BrandingSettings({ data }: BrandingSettingsProps) {
  const queryClient = useQueryClient()
  const [colors, setColors] = useState({
    primaryColor: data.primaryColor ?? '',
    accentColor: data.accentColor ?? '',
    sidebarColor: data.sidebarColor ?? '',
    faviconUrl: data.faviconUrl ?? '',
    logoUrl: data.logoUrl ?? '',
  })

  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    const current = {
      primaryColor: data.primaryColor ?? '',
      accentColor: data.accentColor ?? '',
      sidebarColor: data.sidebarColor ?? '',
      faviconUrl: data.faviconUrl ?? '',
      logoUrl: data.logoUrl ?? '',
    }
    setColors(current)
    setHasChanges(false)
  }, [data])

  const updateMutation = useMutation({
    mutationFn: () => brandingService.update(colors),
    onSuccess: (updated) => {
      queryClient.setQueryData(brandingKeys.all, updated)
      setHasChanges(false)
      toast.success('Branding updated successfully.')
    },
    onError: () => {
      toast.error('Failed to update branding.')
    },
  })

  const handleReset = () => {
    setColors({
      primaryColor: '',
      accentColor: '',
      sidebarColor: '',
      faviconUrl: '',
      logoUrl: '',
    })
    setHasChanges(true)
  }

  const handlePreset = (preset: (typeof PRESETS)[number]) => {
    setColors((prev) => ({
      ...prev,
      primaryColor: preset.primary,
      accentColor: preset.accent,
      sidebarColor: preset.sidebar,
    }))
    setHasChanges(true)
  }

  const handleChange = (key: string, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const previewPrimary = colors.primaryColor || '#6366f1'
  const previewAccent = colors.accentColor || '#e0e7ff'
  const previewSidebar = colors.sidebarColor || '#f8fafc'

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Theme Presets
          </CardTitle>
          <CardDescription>Quick-start color themes. Select a preset then customize further below.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handlePreset(preset)}
                className="flex flex-col items-center gap-2 rounded-lg border p-3 text-sm font-medium transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="flex gap-1">
                  <span className="h-5 w-5 rounded-full border" style={{ backgroundColor: preset.primary }} />
                  <span className="h-5 w-5 rounded-full border" style={{ backgroundColor: preset.accent }} />
                  <span className="h-5 w-5 rounded-full border" style={{ backgroundColor: preset.sidebar }} />
                </div>
                {preset.name}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Color Settings</CardTitle>
            <CardDescription>Customize the primary, accent, and sidebar colors.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-2">
                <input
                  id="primaryColor"
                  type="color"
                  value={colors.primaryColor || '#6366f1'}
                  onChange={(e) => handleChange('primaryColor', e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded-md border"
                />
                <Input
                  value={colors.primaryColor}
                  onChange={(e) => handleChange('primaryColor', e.target.value)}
                  placeholder="#6366f1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accentColor">Accent Color</Label>
              <div className="flex gap-2">
                <input
                  id="accentColor"
                  type="color"
                  value={colors.accentColor || '#e0e7ff'}
                  onChange={(e) => handleChange('accentColor', e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded-md border"
                />
                <Input
                  value={colors.accentColor}
                  onChange={(e) => handleChange('accentColor', e.target.value)}
                  placeholder="#e0e7ff"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sidebarColor">Sidebar Color</Label>
              <div className="flex gap-2">
                <input
                  id="sidebarColor"
                  type="color"
                  value={colors.sidebarColor || '#f8fafc'}
                  onChange={(e) => handleChange('sidebarColor', e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded-md border"
                />
                <Input
                  value={colors.sidebarColor}
                  onChange={(e) => handleChange('sidebarColor', e.target.value)}
                  placeholder="#f8fafc"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                value={colors.logoUrl}
                onChange={(e) => handleChange('logoUrl', e.target.value)}
                placeholder="https://example.com/logo.png"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="faviconUrl">Favicon URL</Label>
              <Input
                id="faviconUrl"
                value={colors.faviconUrl}
                onChange={(e) => handleChange('faviconUrl', e.target.value)}
                placeholder="https://example.com/favicon.ico"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => updateMutation.mutate()}
                disabled={!hasChanges || updateMutation.isPending}
              >
                <Save className="h-4 w-4" />
                {updateMutation.isPending ? 'Saving...' : 'Save branding'}
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
                Reset to default
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
            <CardDescription>See how your branding will look across the application.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border">
              <div className="flex h-48">
                <div
                  className="flex w-40 flex-col border-r p-3"
                  style={{ backgroundColor: previewSidebar }}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold text-white"
                      style={{ backgroundColor: previewPrimary }}
                    >
                      {colors.logoUrl ? (
                        <img src={colors.logoUrl} alt="" className="h-7 w-7 rounded-md object-cover" />
                      ) : (
                        'C'
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: previewPrimary }}>CommunityOS</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {['Dashboard', 'Residents', 'Finance', 'Settings'].map((item, i) => (
                      <div
                        key={item}
                        className="rounded px-2 py-1 text-xs"
                        style={
                          i === 0
                            ? { backgroundColor: `${previewPrimary}15`, color: previewPrimary }
                            : { color: '#64748b' }
                        }
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex-1 bg-white p-3">
                  <div className="mb-2 h-6 w-32 rounded" style={{ backgroundColor: previewPrimary }} />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-14 rounded-lg border bg-gray-50 p-2">
                      <div className="h-2 w-12 rounded bg-gray-200" />
                      <div className="mt-1 h-4 w-16 rounded font-bold" style={{ color: previewPrimary }}>1,234</div>
                    </div>
                    <div className="h-14 rounded-lg border bg-gray-50 p-2">
                      <div className="h-2 w-12 rounded bg-gray-200" />
                      <div className="mt-1 h-4 w-16 rounded font-bold" style={{ color: previewPrimary }}>5,678</div>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-1">
                    <div className="h-6 w-16 rounded text-[10px] text-white flex items-center justify-center" style={{ backgroundColor: previewPrimary }}>
                      Action
                    </div>
                    <div className="h-6 w-16 rounded border text-[10px] flex items-center justify-center" style={{ borderColor: previewAccent, color: previewPrimary }}>
                      Cancel
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Primary:</span>
                <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: previewPrimary }} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Accent:</span>
                <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: previewAccent }} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Sidebar:</span>
                <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: previewSidebar }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
