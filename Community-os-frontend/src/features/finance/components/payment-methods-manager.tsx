import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, Loader2, Pencil, Trash2 } from 'lucide-react'

import {
  ActivePaymentMethod,
  PaymentMethodConfig,
  PaymentMethodConfigDisplay,
  PaymentMethodConfigInput,
  PaymentMethodConfigMethod,
} from '@/features/finance/types/finance'
import { documentsService } from '@/features/documents/services/documents'
import { apiErrorMessage } from '@/lib/api'
import { toast } from '@/components/ui/sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface PaymentMethodsManagerService {
  listAdmin(): Promise<PaymentMethodConfig[]>
  save(input: PaymentMethodConfigInput): Promise<PaymentMethodConfig>
  update(method: string, input: PaymentMethodConfigInput): Promise<PaymentMethodConfig>
  remove(method: string): Promise<unknown>
}

const METHOD_LABELS: Record<PaymentMethodConfigMethod, string> = {
  GCASH: 'GCash',
  MAYA: 'Maya',
  BANK_TRANSFER: 'Bank Transfer',
}

const METHOD_OPTIONS = ['GCASH', 'MAYA', 'BANK_TRANSFER'] as const

interface EditState {
  config: PaymentMethodConfig | null
  displayMode: PaymentMethodConfigDisplay
  accountName: string
  accountNumber: string
  instructions: string
  isActive: boolean
  qrPreview: string | null
}

export function PaymentMethodsManager({
  service,
  queryKey,
}: {
  service: PaymentMethodsManagerService
  queryKey: string[]
}) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<EditState | null>(null)
  const [uploading, setUploading] = useState(false)

  const { data: configs, isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: service.listAdmin,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [queryKey] })
  }

  const saveMutation = useMutation({
    mutationFn: (input: PaymentMethodConfigInput) => {
      const existed = editing?.config?.configured
      const method = editing?.config?.method ?? (input.method as PaymentMethodConfigMethod)
      return existed
        ? service.update(method, input)
        : service.save(input)
    },
    onSuccess: () => {
      toast.success('Payment method saved.')
      setEditing(null)
      invalidate()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to save payment method.')),
  })

  const removeMutation = useMutation({
    mutationFn: (method: PaymentMethodConfigMethod) => service.remove(method),
    onSuccess: () => {
      toast.success('Payment method removed.')
      invalidate()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to remove payment method.')),
  })

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const result = await documentsService.upload(file)
      setEditing((prev) => (prev ? { ...prev, qrPreview: result.url } : prev))
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Failed to upload QR image.'))
    } finally {
      setUploading(false)
    }
  }

  const submit = () => {
    if (!editing) return
    const method = editing.config?.method
    if (!method) return
    const isNumberMode = editing.displayMode === 'NUMBER' || editing.displayMode === 'BOTH'
    const isQrMode = editing.displayMode === 'QR' || editing.displayMode === 'BOTH'
    if (isNumberMode && !editing.accountNumber.trim()) {
      toast.error('Account number is required for NUMBER or BOTH modes.')
      return
    }
    if (isQrMode && !editing.qrPreview) {
      toast.error('A QR image is required for QR or BOTH modes.')
      return
    }
    saveMutation.mutate({
      method,
      displayMode: editing.displayMode,
      accountName: editing.accountName || undefined,
      accountNumber: editing.accountNumber || undefined,
      qrUrl: editing.qrPreview || undefined,
      instructions: editing.instructions || undefined,
      isActive: editing.isActive,
    })
  }

  const activeMethods = useMemo(() => {
    if (!configs) return []
    return configs.filter((c) => c.isActive && c.configured)
  }, [configs])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Online payment methods</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {METHOD_OPTIONS.map((method) => {
          const config = configs?.find((c) => c.method === method)
          const active = config?.isActive && config?.configured
          return (
            <div
              key={method}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-medium">{METHOD_LABELS[method]}</p>
                  <p className="text-sm text-muted-foreground">
                    {config?.configured
                      ? config.displayMode === 'NUMBER'
                        ? `Number ${config.accountNumber ?? ''}`
                        : config.displayMode === 'BOTH'
                          ? 'QR + number'
                          : 'QR image'
                      : 'Not configured'}
                  </p>
                </div>
                <Badge variant={active ? 'default' : 'secondary'}>
                  {active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEditing({
                      config: config ?? {
                        method,
                        configured: false,
                        isActive: true,
                        displayMode: 'QR',
                      },
                      displayMode: config?.displayMode ?? 'QR',
                      accountName: config?.accountName ?? '',
                      accountNumber: config?.accountNumber ?? '',
                      instructions: config?.instructions ?? '',
                      isActive: config?.isActive ?? true,
                      qrPreview: config?.qrUrl ?? null,
                    })
                  }
                >
                  <Pencil className="h-4 w-4" />
                  {config?.configured ? 'Edit' : 'Add'}
                </Button>
                {config?.configured && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMutation.mutate(method)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )
        })}

        {activeMethods.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Residents will see {activeMethods.map((m) => METHOD_LABELS[m.method]).join(', ')}.
          </p>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing?.config?.method ? METHOD_LABELS[editing.config.method] : 'Payment method'}
            </DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Display</Label>
                <Select
                  value={editing.displayMode}
                  onValueChange={(v) =>
                    setEditing((prev) =>
                      prev ? { ...prev, displayMode: v as PaymentMethodConfigDisplay } : prev,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="QR">QR image</SelectItem>
                    <SelectItem value="NUMBER">Account number</SelectItem>
                    <SelectItem value="BOTH">QR image + number</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(editing.displayMode === 'QR' || editing.displayMode === 'BOTH') && (
                <div className="grid gap-2">
                  <Label>QR image</Label>
                  {editing.qrPreview ? (
                    <a
                      href={editing.qrPreview}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-sm text-primary"
                    >
                      <ImagePlus className="h-4 w-4" /> View uploaded QR
                    </a>
                  ) : (
                    <Label className="flex items-center gap-2 rounded-lg border p-3 text-sm text-muted-foreground">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                      />
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                      Upload QR image
                    </Label>
                  )}
                </div>
              )}

              {(editing.displayMode === 'NUMBER' || editing.displayMode === 'BOTH') && (
                <>
                  <div className="grid gap-2">
                    <Label>Account name</Label>
                    <Input
                      value={editing.accountName}
                      onChange={(e) =>
                        setEditing((prev) =>
                          prev ? { ...prev, accountName: e.target.value } : prev,
                        )
                      }
                      placeholder="e.g. Green Valley Homeowners Assoc."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Account number</Label>
                    <Input
                      value={editing.accountNumber}
                      onChange={(e) =>
                        setEditing((prev) =>
                          prev ? { ...prev, accountNumber: e.target.value } : prev,
                        )
                      }
                      placeholder="e.g. 0917 123 4567"
                    />
                  </div>
                </>
              )}

              <div className="grid gap-2">
                <Label>Instructions</Label>
                <Textarea
                  value={editing.instructions}
                  onChange={(e) =>
                    setEditing((prev) =>
                      prev ? { ...prev, instructions: e.target.value } : prev,
                    )
                  }
                  placeholder="e.g. Scan the QR or send to the number above, then upload a screenshot as proof."
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="active">Active</Label>
                <Switch
                  id="active"
                  checked={editing.isActive}
                  onCheckedChange={(v) =>
                    setEditing((prev) => (prev ? { ...prev, isActive: v } : prev))
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saveMutation.isPending || uploading}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export function ActivePaymentMethods({
  methods,
}: {
  methods?: ActivePaymentMethod[]
}) {
  return (
    <div className="grid gap-3">
      {methods?.map((m) => (
        <Card key={m.method}>
          <CardContent className="pt-6">
            <p className="mb-2 font-medium">{METHOD_LABELS[m.method]}</p>
            {(m.displayMode === 'QR' || m.displayMode === 'BOTH') && m.qrUrl && (
              <a
                href={m.qrUrl}
                target="_blank"
                rel="noreferrer"
                className="mb-2 block text-sm text-primary"
              >
                <ImagePlus className="mr-1 inline h-4 w-4" /> View QR to scan
              </a>
            )}
            {(m.displayMode === 'NUMBER' || m.displayMode === 'BOTH') && m.accountNumber && (
              <p className="text-sm">
                {m.accountName ? (
                  <>
                    <span className="font-medium">{m.accountName}</span>
                    <br />
                  </>
                ) : null}
                {m.accountNumber}
              </p>
            )}
            {m.instructions && (
              <p className="mt-2 text-sm text-muted-foreground">{m.instructions}</p>
            )}
          </CardContent>
        </Card>
      ))}
      {!methods?.length && (
        <p className="text-sm text-muted-foreground">No online payment methods configured yet.</p>
      )}
    </div>
  )
}