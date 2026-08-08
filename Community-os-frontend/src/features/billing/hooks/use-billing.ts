import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import {
  cancelSubscription,
  fetchBillingLimits,
  fetchBillingSummary,
  fetchInvoices,
  fetchSubscription,
  fetchSubscriptionPlans,
  generateInvoice,
  renewSubscription,
  subscribeToPlan,
} from '@/features/billing/services/billing'

const BILLING_KEYS = ['billing', 'subscription', 'invoices']

export function useBillingSummary() {
  return useQuery({
    queryKey: ['billing', 'summary'],
    queryFn: fetchBillingSummary,
  })
}

export function useBillingLimits() {
  return useQuery({
    queryKey: ['billing', 'limits'],
    queryFn: fetchBillingLimits,
  })
}

export function useSubscription() {
  return useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: fetchSubscription,
  })
}

export function useInvoices() {
  return useQuery({
    queryKey: ['billing', 'invoices'],
    queryFn: fetchInvoices,
  })
}

export function usePlansList() {
  return useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: fetchSubscriptionPlans,
  })
}

function useInvalidateBilling() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: BILLING_KEYS })
}

export function useSubscribeToPlan() {
  const invalidate = useInvalidateBilling()

  return useMutation({
    mutationFn: (planId: string) => subscribeToPlan(planId),
    onSuccess: () => {
      toast.success('Subscription activated.')
      invalidate()
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Failed to activate subscription.'))
    },
  })
}

export function useRenewSubscription() {
  const invalidate = useInvalidateBilling()

  return useMutation({
    mutationFn: (id: string) => renewSubscription(id),
    onSuccess: () => {
      toast.success('Subscription renewed.')
      invalidate()
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Failed to renew subscription.'))
    },
  })
}

export function useCancelSubscription() {
  const invalidate = useInvalidateBilling()

  return useMutation({
    mutationFn: (id: string) => cancelSubscription(id),
    onSuccess: () => {
      toast.success('Subscription cancelled.')
      invalidate()
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Failed to cancel subscription.'))
    },
  })
}

export function useGenerateInvoice() {
  const invalidate = useInvalidateBilling()

  return useMutation({
    mutationFn: (id: string) => generateInvoice(id),
    onSuccess: () => {
      toast.success('Invoice generated.')
      invalidate()
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Failed to generate invoice.'))
    },
  })
}
