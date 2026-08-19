import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useFeatures, useCreateFeature, useUpdateFeature } from '@/features/admin/hooks/use-features'
import type { Feature, FeatureType } from '@/features/admin/types/feature'

interface FeatureFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  feature?: Feature | null
}

export function FeatureFormDialog({ open, onOpenChange, feature }: FeatureFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <FeatureFormBody
          key={feature?.id ?? 'create'}
          feature={feature}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  )
}

function FeatureFormBody({
  feature,
  onOpenChange,
}: {
  feature?: Feature | null
  onOpenChange: (open: boolean) => void
}) {
  const isEdit = Boolean(feature)
  const createFeature = useCreateFeature()
  const updateFeature = useUpdateFeature()
  const { data: allFeatures } = useFeatures({ limit: 100 })

  const [code, setCode] = useState(feature?.code ?? '')
  const [name, setName] = useState(feature?.name ?? '')
  const [description, setDescription] = useState(feature?.description ?? '')
  const [type, setType] = useState<FeatureType>(feature?.type ?? 'OPTIONAL')
  const [isActive, setIsActive] = useState(feature?.isActive ?? true)
  const [dependencies, setDependencies] = useState<string[]>(feature?.dependencies ?? [])
  const [configSchemaText, setConfigSchemaText] = useState(
    feature?.configSchema ? JSON.stringify(feature.configSchema, null, 2) : '',
  )
  const [schemaError, setSchemaError] = useState<string | null>(null)

  const otherFeatures = (allFeatures?.items ?? []).filter((f) => f.id !== feature?.id)

  const toggleDep = (depCode: string) => {
    setDependencies((prev) =>
      prev.includes(depCode) ? prev.filter((d) => d !== depCode) : [...prev, depCode],
    )
  }

  const handleSubmit = () => {
    if (!code.trim() || !name.trim()) return

    let parsedSchema: Record<string, unknown> | undefined
    if (configSchemaText.trim()) {
      try {
        parsedSchema = JSON.parse(configSchemaText)
        setSchemaError(null)
      } catch {
        setSchemaError('Invalid JSON.')
        return
      }
    }

    const input = {
      code: code.trim(),
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      isActive,
      dependencies: dependencies.length ? dependencies : undefined,
      configSchema: parsedSchema,
    }

    if (isEdit && feature) {
      updateFeature.mutate(
        { id: feature.id, input },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      createFeature.mutate(input, { onSuccess: () => onOpenChange(false) })
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Edit feature' : 'New feature'}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? 'Update the details of this feature.'
            : 'Register a new feature in the platform catalog.'}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Code</label>
            <Input
              placeholder="e.g. visitor-management"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isEdit}
            />
            <p className="text-xs text-muted-foreground">
              Lowercase, unique identifier. Cannot be changed after creation.
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Name</label>
            <Input
              placeholder="e.g. Visitor Management"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description</label>
          <Textarea
            placeholder="Optional description…"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Type</label>
            <Select value={type} onValueChange={(v) => setType(v as FeatureType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPTIONAL">Optional</SelectItem>
                <SelectItem value="STANDARD">Standard</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Standard features auto-enable for all communities.
            </p>
          </div>
          <div className="flex items-end">
            <label className="flex items-center justify-between gap-3 rounded-md border p-3 w-full">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">
                  Inactive features cannot be assigned.
                </p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </label>
          </div>
        </div>

        {otherFeatures.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Dependencies</label>
            <p className="text-xs text-muted-foreground">
              This feature requires these features to be enabled first.
            </p>
            <div className="flex flex-wrap gap-2">
              {otherFeatures.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggleDep(f.code)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                    dependencies.includes(f.code)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted bg-background text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Config Schema (JSON)</label>
          <Textarea
            placeholder='{"required": ["verificationMode"], "properties": {"verificationMode": {"type": "string", "enum": ["auto", "approval"]}}}'
            rows={4}
            value={configSchemaText}
            onChange={(e) => {
              setConfigSchemaText(e.target.value)
              setSchemaError(null)
            }}
            className="font-mono text-xs"
          />
          {schemaError && <p className="text-xs text-destructive">{schemaError}</p>}
          <p className="text-xs text-muted-foreground">
            Optional JSON Schema to validate per-community config.
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={!code.trim() || !name.trim() || createFeature.isPending || updateFeature.isPending}
          onClick={handleSubmit}
        >
          {isEdit ? 'Save changes' : 'Create feature'}
        </Button>
      </DialogFooter>
    </>
  )
}
