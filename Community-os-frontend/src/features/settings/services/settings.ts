import api from '@/lib/api'
import type { ApiEnvelope } from '@/types/api'
import type { SettingResult, UpdateSettingEntry } from '@/features/settings/types/setting'

export const settingsService = {
  async all() {
    const { data } = await api.get<ApiEnvelope<SettingResult[]>>('/settings')
    return data.data
  },

  async updateMany(settings: UpdateSettingEntry[]) {
    const { data } = await api.put<ApiEnvelope<SettingResult[]>>('/settings', { settings })
    return data.data
  },
}
