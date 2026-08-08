export interface PlatformSettingResult {
  key: string
  value: unknown
  group: string
  configured: boolean
}

export interface UpdatePlatformSettingEntry {
  key: string
  value: unknown
  group: string
}

export type PlatformSettingValue = string
