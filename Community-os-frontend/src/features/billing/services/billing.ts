import api from '@/lib/api'
import type {
  ApiEnvelope,
  BillingLimits,
  BillingSummary,
  Invoice,
  Subscription,
  SubscriptionPlan,
} from '@/types/api'
import type { ActivePaymentMethod } from '@/features/finance/types/finance'

export async function fetchBillingSummary() {
  const { data } = await api.get<ApiEnvelope<BillingSummary>>('/billing/summary')
  return data.data
}

export async function fetchBillingLimits() {
  const { data } = await api.get<ApiEnvelope<BillingLimits>>('/billing/limits')
  return data.data
}

export async function fetchSubscription() {
  const { data } = await api.get<ApiEnvelope<Subscription>>('/subscriptions/current')
  return data.data
}

export async function fetchInvoices() {
  const { data } = await api.get<ApiEnvelope<Invoice[]>>('/invoices')
  return data.data
}

export async function fetchSubscriptionPlans() {
  const { data } = await api.get<ApiEnvelope<SubscriptionPlan[]>>('/subscription-plans')
  return data.data
}

export async function subscribeToPlan(planId: string) {
  const { data } = await api.post<ApiEnvelope<Subscription>>('/subscriptions', { planId })
  return data.data
}

export async function renewSubscription(id: string) {
  const { data } = await api.post<ApiEnvelope<Subscription>>(`/subscriptions/${id}/renew`)
  return data.data
}

export async function cancelSubscription(id: string) {
  const { data } = await api.post<ApiEnvelope<Subscription>>(`/subscriptions/${id}/cancel`)
  return data.data
}

export async function generateInvoice(id: string) {
  const { data } = await api.post<ApiEnvelope<Invoice>>(`/subscriptions/${id}/generate-invoice`)
  return data.data
}

export async function fetchPlatformPaymentMethods() {
  const { data } = await api.get<ApiEnvelope<ActivePaymentMethod[]>>(
    '/payment-methods/platform',
  )
  return data.data
}

export async function markInvoicePaid(id: string, paymentMethod?: string) {
  const { data } = await api.post<ApiEnvelope<Invoice>>(`/invoices/${id}/mark-paid`, {
    paymentMethod,
  })
  return data.data
}

export interface InvoiceCheckoutResult {
  invoiceId: string
  checkoutUrl: string
  gatewayId: string
}

export async function checkoutInvoice(id: string) {
  const { data } = await api.post<ApiEnvelope<InvoiceCheckoutResult>>(
    `/invoices/${id}/checkout`,
  )
  return data.data
}
