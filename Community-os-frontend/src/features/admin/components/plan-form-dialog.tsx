import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  billingCycles,
  planTiers,
  planSchema,
  type PlanFormValues,
} from '@/features/admin/validation/plan'
import { useCreatePlan, useUpdatePlan } from '@/features/admin/hooks/use-plans'
import { useFeatures } from '@/features/admin/hooks/use-features'
import type { AdminPlan } from '@/features/admin/types/plan'
import { cn } from '@/lib/utils'

interface PlanFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan?: AdminPlan | null
}

function toNumber(value: string | undefined) {
  if (!value || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function featuresToText(features: string[]) {
  return features.join('\n')
}

function textToFeatures(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function PlanFormDialog({
  open,
  onOpenChange,
  plan,
}: PlanFormDialogProps) {
  const isEdit = Boolean(plan)
  const createPlan = useCreatePlan()
  const updatePlan = useUpdatePlan()
  const { data: featuresData } = useFeatures({ limit: 100 })

  const features = featuresData?.items ?? []
  const standardFeatures = features.filter(
    (f) => f.type === 'STANDARD' && f.isActive,
  )
  const optionalFeatures = features.filter(
    (f) => f.type === 'OPTIONAL' && f.isActive,
  )

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      price: '',
      billingCycle: 'MONTHLY',
      tier: 'STANDARD',
      maxUsers: '1',
      maxResidents: '0',
      sortOrder: '0',
      featuresText: '',
      featureIds: [],
      isActive: true,
    },
  })

  useEffect(() => {
    if (open) {
      const linkedFeatureIds =
        plan?.planFeatures?.map((pf) => pf.feature.id) ?? []
      form.reset({
        code: plan?.code ?? '',
        name: plan?.name ?? '',
        description: plan?.description ?? '',
        price: plan?.price != null ? String(plan.price) : '',
        billingCycle: plan?.billingCycle ?? 'MONTHLY',
        tier: plan?.tier ?? 'STANDARD',
        maxUsers: plan?.maxUsers != null ? String(plan.maxUsers) : '1',
        maxResidents:
          plan?.maxResidents != null ? String(plan.maxResidents) : '0',
        sortOrder: plan?.sortOrder != null ? String(plan.sortOrder) : '0',
        featuresText: plan?.features?.length
          ? featuresToText(plan.features)
          : '',
        featureIds: linkedFeatureIds,
        isActive: plan?.isActive ?? true,
      })
    }
  }, [open, plan, form])

  const handleSubmit = (values: PlanFormValues) => {
    const input = {
      code: values.code,
      name: values.name,
      description: values.description || undefined,
      price: Number(values.price),
      billingCycle: values.billingCycle,
      tier: values.tier,
      maxUsers: Number(values.maxUsers),
      maxResidents: toNumber(values.maxResidents) ?? 0,
      sortOrder: toNumber(values.sortOrder) ?? 0,
      features: textToFeatures(values.featuresText ?? ''),
      featureIds: values.featureIds,
      isActive: values.isActive,
    }

    if (isEdit && plan) {
      updatePlan.mutate(
        { id: plan.id, input },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      createPlan.mutate(input, { onSuccess: () => onOpenChange(false) })
    }
  }

  const selectedIds = form.watch('featureIds') ?? []
  const toggleFeature = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((fid) => fid !== id)
      : [...selectedIds, id]
    form.setValue('featureIds', next, { shouldDirty: true })
  }

  const FeatureCheckbox = ({
    feature,
    disabled,
  }: {
    feature: { id: string; name: string; code: string; type: string }
    disabled?: boolean
  }) => {
    const checked = selectedIds.includes(feature.id)
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => toggleFeature(feature.id)}
        className={cn(
          'flex items-start gap-2 rounded-lg border p-2.5 text-left text-sm transition-colors',
          disabled && 'cursor-not-allowed opacity-60',
          checked
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/40',
        )}
      >
        <span
          className={cn(
            'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border',
            checked
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border',
          )}
        >
          {checked ? <span className="text-[10px] leading-none">✓</span> : null}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium">{feature.name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {feature.code}
          </span>
        </span>
      </button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit plan' : 'New plan'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the details of this subscription plan.'
              : 'Add a subscription plan for communities.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Community Basic" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. community-basic" {...field} />
                    </FormControl>
                    <FormDescription>
                      Lowercase, unique identifier.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional details…"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (PHP)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="e.g. 99"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billingCycle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing cycle</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a cycle" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {billingCycles.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="tier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan tier</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a tier" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {planTiers.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Custom plans are tailored for specific communities.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="maxUsers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max users</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="e.g. 50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxResidents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max residents</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="e.g. 500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort order</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g. 0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="featureIds"
              render={() => (
                <FormItem>
                  <FormLabel>Included feature modules</FormLabel>
                  <FormDescription>
                    Select the modules available to communities on this plan.
                    Standard features are always bundled in every plan.
                  </FormDescription>
                  <div className="mt-3 space-y-3 border rounded-lg p-3">
                    {standardFeatures.length > 0 && (
                      <div>
                        <div className="mb-1.5 flex items-center gap-2">
                          <Badge variant="secondary">Standard</Badge>
                          <span className="text-xs text-muted-foreground">
                            Always included in every plan
                          </span>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {standardFeatures.map((feature) => (
                            <FeatureCheckbox
                              key={feature.id}
                              feature={feature}
                              disabled
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {optionalFeatures.length > 0 && (
                      <div
                        className={
                          standardFeatures.length > 0 ? 'pt-3 border-t' : ''
                        }
                      >
                        <div className="mb-1.5 flex items-center gap-2">
                          <Badge variant="warning">Optional</Badge>
                          <span className="text-xs text-muted-foreground">
                            Select modules to bundle in this plan
                          </span>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {optionalFeatures.map((feature) => (
                            <FeatureCheckbox
                              key={feature.id}
                              feature={feature}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {features.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No features available yet.
                      </p>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="featuresText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feature highlights (display)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        'One bullet per line:\nUp to 50 users\nFree guest passes'
                      }
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Shown as marketing bullets on the landing page and billing
                    page.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      Inactive plans are hidden from new subscriptions.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createPlan.isPending || updatePlan.isPending}
              >
                {isEdit ? 'Save changes' : 'Create plan'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
