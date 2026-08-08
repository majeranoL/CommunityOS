export interface SettingEntry {
  key: string
  value: unknown
  group: string
  isPublic: boolean
}

export interface SettingResult extends SettingEntry {
  configured: boolean
}

export interface UpdateSettingEntry {
  key: string
  value: unknown
  group: string
}

export type SettingValue = string | boolean | number
