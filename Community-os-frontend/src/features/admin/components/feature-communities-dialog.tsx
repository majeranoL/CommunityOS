import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import {
  useFeatureCommunities,
  useRevokeFeature,
  useUpdateFeatureAssignment,
} from '@/features/admin/hooks/use-features'
import type { Feature, FeatureAssignment } from '@/features/admin/types/feature'

const PET_FEATURE = 'pet-registration'
const VERIFICATION_MODES = ['auto', 'approval'] as const
const GOOD_BAD_STANDING_FEATURE = 'good-bad-standing'
const DEFAULT_DELINQUENCY_THRESHOLD_MONTHS = 3

interface FeatureCommunitiesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  feature: Feature | null
}

export function FeatureCommunitiesDialog({ open, onOpenChange, feature }: FeatureCommunitiesDialogProps) {
  const { data, isLoading } = useFeatureCommunities(open ? (feature?.id ?? null) : null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{feature?.name}</DialogTitle>
          <DialogDescription>
            Communities with this feature assigned. Toggle availability, edit per-community
            configuration, or revoke the feature.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : data?.length ? (
            data.map((assignment) =>
              feature ? (
                <AssignmentRow key={assignment.id} assignment={assignment} feature={feature} />
              ) : null,
            )
          ) : (
            <EmptyState
              icon={Trash2}
              title="No assigned communities"
              description="Use Assign to enable this feature for a community."
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function AssignmentRow({ assignment, feature }: { assignment: FeatureAssignment; feature: Feature }) {
  const [revoking, setRevoking] = useState(false)

  const updateAssignment = useUpdateFeatureAssignment()
  const revokeFeature = useRevokeFeature()

  const toggle = (enabled: boolean) =>
    updateAssignment.mutate({
      featureId: feature.id,
      communityId: assignment.communityId,
      input: { enabled },
    })

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{assignment.community?.displayName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {assignment.community?.code} · {assignment.community?.status?.toLowerCase()}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={assignment.enabled ? 'success' : 'muted'}>
            {assignment.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
          <Switch
            checked={assignment.enabled}
            onCheckedChange={toggle}
            disabled={updateAssignment.isPending}
            aria-label="Toggle feature"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={() => setRevoking(true)}
            aria-label="Revoke feature"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {feature.code === PET_FEATURE ? (
        <PetRegistrationConfig assignment={assignment} featureId={feature.id} />
      ) : feature.code === GOOD_BAD_STANDING_FEATURE ? (
        <GoodBadStandingConfig assignment={assignment} featureId={feature.id} />
      ) : (
        <GenericConfigEditor assignment={assignment} featureId={feature.id} />
      )}

      <ConfirmDialog
        open={revoking}
        onOpenChange={setRevoking}
        title="Revoke feature?"
        description={`This will remove ${feature.name} from ${assignment.community?.displayName}. The community will lose access until it is assigned again.`}
        confirmLabel="Revoke"
        destructive
        loading={revokeFeature.isPending}
        onConfirm={() =>
          revokeFeature.mutate(
            { featureId: feature.id, communityId: assignment.communityId },
            { onSuccess: () => setRevoking(false) },
          )
        }
      />
    </div>
  )
}

function PetRegistrationConfig({
  assignment,
  featureId,
}: {
  assignment: FeatureAssignment
  featureId: string
}) {
  const initial = (assignment.config ?? {}) as {
    verificationMode?: string
    documentsRequired?: boolean
  }
  const [verificationMode, setVerificationMode] = useState(initial.verificationMode ?? 'auto')
  const [documentsRequired, setDocumentsRequired] = useState(initial.documentsRequired === true)
  const [saving, setSaving] = useState(false)

  const updateAssignment = useUpdateFeatureAssignment()

  const save = () => {
    setSaving(true)
    updateAssignment.mutate(
      {
        featureId,
        communityId: assignment.communityId,
        input: { config: { verificationMode, documentsRequired } },
      },
      { onSettled: () => setSaving(false) },
    )
  }

  return (
    <div className="space-y-3 rounded-md border border-dashed p-3">
      <div className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Verification mode
        </p>
        <Select value={verificationMode} onValueChange={setVerificationMode}>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {VERIFICATION_MODES.map((mode) => (
              <SelectItem key={mode} value={mode}>
                {mode === 'auto' ? 'Automatic' : 'Officer approval'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between rounded-md border p-2.5">
        <div>
          <p className="text-sm font-medium">Documents required</p>
          <p className="text-xs text-muted-foreground">
            Require vaccination, rabies, and veterinary certificates.
          </p>
        </div>
        <Switch checked={documentsRequired} onCheckedChange={setDocumentsRequired} />
      </div>
      <Button type="button" variant="outline" size="sm" onClick={save} disabled={saving}>
        Save configuration
      </Button>
    </div>
  )
}

function GoodBadStandingConfig({
  assignment,
  featureId,
}: {
  assignment: FeatureAssignment
  featureId: string
}) {
  const initial = (assignment.config ?? {}) as {
    delinquencyThresholdMonths?: number
    restrictedServices?: string[]
  }
  const [threshold, setThreshold] = useState(
    initial.delinquencyThresholdMonths ?? DEFAULT_DELINQUENCY_THRESHOLD_MONTHS,
  )
  const [restrictFacilities, setRestrictFacilities] = useState(
    Array.isArray(initial.restrictedServices)
      ? initial.restrictedServices.includes('facility_reservations')
      : true,
  )
  const [saving, setSaving] = useState(false)

  const updateAssignment = useUpdateFeatureAssignment()

  const save = () => {
    setSaving(true)
    const restrictedServices = restrictFacilities ? ['facility_reservations'] : []
    updateAssignment.mutate(
      {
        featureId,
        communityId: assignment.communityId,
        input: { config: { delinquencyThresholdMonths: threshold, restrictedServices } },
      },
      { onSettled: () => setSaving(false) },
    )
  }

  return (
    <div className="space-y-3 rounded-md border border-dashed p-3">
      <div className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Delinquency threshold
        </p>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            value={threshold}
            onChange={(event) =>
              setThreshold(Math.max(1, Number(event.target.value)))
            }
            className="w-24"
          />
          <p className="text-xs text-muted-foreground">
            months overdue before a household is BAD standing
          </p>
        </div>
      </div>
      <label className="flex items-start justify-between gap-3 rounded-md border p-2.5">
        <div>
          <p className="text-sm font-medium">Restrict facility reservations</p>
          <p className="text-xs text-muted-foreground">
            Block BAD standing households from creating facility reservations.
          </p>
        </div>
        <Checkbox
          checked={restrictFacilities}
          onCheckedChange={(value) => setRestrictFacilities(value === true)}
        />
      </label>
      <Button type="button" variant="outline" size="sm" onClick={save} disabled={saving}>
        Save configuration
      </Button>
    </div>
  )
}

function GenericConfigEditor({
  assignment,
  featureId,
}: {
  assignment: FeatureAssignment
  featureId: string
}) {
  const [text, setText] = useState(
    JSON.stringify(assignment.config ?? {}, null, 2),
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const updateAssignment = useUpdateFeatureAssignment()

  const save = () => {
    let parsed: Record<string, unknown>
    try {
      parsed = text.trim() ? JSON.parse(text) : {}
    } catch {
      setError('Invalid JSON.')
      return
    }
    setError(null)
    setSaving(true)
    updateAssignment.mutate(
      {
        featureId,
        communityId: assignment.communityId,
        input: { config: parsed },
      },
      { onSettled: () => setSaving(false) },
    )
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed p-3">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Configuration (JSON)
      </p>
      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={4}
        className="font-mono text-xs"
        placeholder="{}"
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <Button type="button" variant="outline" size="sm" onClick={save} disabled={saving}>
        Save configuration
      </Button>
    </div>
  )
}
