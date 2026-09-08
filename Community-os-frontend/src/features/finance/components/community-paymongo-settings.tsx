import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Loader2, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import { paymentMethodsService } from '@/features/finance/services/finance'

export function CommunityPayMongoSettings() {
  const queryClient = useQueryClient()
  const [secretKey, setSecretKey] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [accountName, setAccountName] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['community-paymongo'],
    queryFn: paymentMethodsService.getPayMongo,
  })

  const saveMutation = useMutation({
    mutationFn: paymentMethodsService.updatePayMongo,
    onSuccess: () => {
      toast.success('Community PayMongo account saved.')
      setSecretKey('')
      setWebhookSecret('')
      queryClient.invalidateQueries({ queryKey: ['community-paymongo'] })
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, 'Failed to save PayMongo account.')),
  })

  const removeMutation = useMutation({
    mutationFn: paymentMethodsService.removePayMongo,
    onSuccess: () => {
      toast.success('Community PayMongo account removed.')
      queryClient.invalidateQueries({ queryKey: ['community-paymongo'] })
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, 'Failed to remove PayMongo account.')),
  })

  const save = () => {
    if (!secretKey.trim()) {
      toast.error('Enter the PayMongo secret key.')
      return
    }
    saveMutation.mutate({
      secretKey: secretKey.trim(),
      webhookSecret: webhookSecret.trim() || undefined,
      accountName: accountName.trim() || undefined,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Card and online checkout
          {data?.configured ? (
            <Badge>Configured</Badge>
          ) : (
            <Badge variant="secondary">Not configured</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Connect this community&apos;s PayMongo account so dues paid by card,
          GCash, or Maya checkout settle to the community. Never enter or store
          card numbers here.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="paymongo-account-name">Account name</Label>
          <Input
            id="paymongo-account-name"
            value={accountName}
            onChange={(event) => setAccountName(event.target.value)}
            placeholder="e.g. Green Valley Homeowners Association"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="paymongo-secret-key">Secret key</Label>
          <Input
            id="paymongo-secret-key"
            type="password"
            value={secretKey}
            onChange={(event) => setSecretKey(event.target.value)}
            placeholder={
              data?.configured
                ? 'Enter a new key to replace the saved key'
                : 'sk_live_...'
            }
            autoComplete="new-password"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="paymongo-webhook-secret">
            Webhook secret (optional)
          </Label>
          <Input
            id="paymongo-webhook-secret"
            type="password"
            value={webhookSecret}
            onChange={(event) => setWebhookSecret(event.target.value)}
            placeholder="whsec_..."
            autoComplete="new-password"
          />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {data?.configured ? (
            <Button
              variant="outline"
              onClick={() => removeMutation.mutate()}
              disabled={removeMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
          ) : null}
          <Button onClick={save} disabled={isLoading || saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Save PayMongo account
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
