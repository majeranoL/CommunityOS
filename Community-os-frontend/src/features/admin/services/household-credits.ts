import api from '@/lib/api'
import type { ApiEnvelope } from '@/types/api'
import type {
  HouseholdCredit,
  HouseholdCreditApplyInput,
  HouseholdCreditApplyResult,
} from '@/features/finance/types/finance'

export interface AdminHouseholdCreditIssueInput {
  communityId: string
  householdId: string
  amount: number
  reason?: string
  referenceNumber?: string
}

export interface HouseholdOption {
  id: string
  block: string | null
  lot: string | null
  unit: string | null
  address: string | null
}

export const adminHouseholdCreditsService = {
  async list(params: { communityId?: string; householdId?: string } = {}) {
    const { data } = await api.get<HouseholdCredit[]>('/admin/household-credits', {
      params,
    })
    return data
  },

  async households(communityId: string) {
    const { data } = await api.get<HouseholdOption[]>(
      '/admin/household-credits/households',
      { params: { communityId } },
    )
    return data
  },

  async issue(input: AdminHouseholdCreditIssueInput) {
    const { data } = await api.post<HouseholdCredit>(
      '/admin/household-credits',
      input,
    )
    return data
  },

  async adjust(id: string, amount: number) {
    const { data } = await api.patch<HouseholdCredit>(
      `/admin/household-credits/${id}`,
      { amount },
    )
    return data
  },

  async void(id: string) {
    const { data } = await api.post<{ success: boolean; message: string }>(
      `/admin/household-credits/${id}/void`,
    )
    return data
  },

  async apply(input: HouseholdCreditApplyInput & { communityId: string }) {
    const { data } = await api.post<ApiEnvelope<HouseholdCreditApplyResult>>(
      '/admin/household-credits/apply',
      input,
    )
    return data.data
  },
}

export function householdUnitLabel(household: HouseholdOption) {
  const parts = [
    household.block ? `Blk ${household.block}` : null,
    household.lot ? `Lot ${household.lot}` : null,
    household.unit ? `Unit ${household.unit}` : null,
    household.address ?? null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : 'Unnamed household'
}