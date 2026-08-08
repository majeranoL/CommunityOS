import api from '@/lib/api'
import type { ApiEnvelope } from '@/types/api'
import type {
  PlatformSettingResult,
  UpdatePlatformSettingEntry,
} from '@/features/admin/types/platform-settings'

export const platformSettingsService = {
  async all() {
    const { data } = await api.get<ApiEnvelope<PlatformSettingResult[]>>('/admin/platform-settings')
    return data.data
  },

  async updateMany(settings: UpdatePlatformSettingEntry[]) {
    const { data } = await api.put<ApiEnvelope<PlatformSettingResult[]>>(
      '/admin/platform-settings',
      { settings },
    )
    return data.data
  },
}
