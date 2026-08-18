export interface BrandingData {
  displayName: string
  logoUrl: string | null
  primaryColor: string | null
  accentColor: string | null
  sidebarColor: string | null
  faviconUrl: string | null
}

export interface BrandingUpdateInput {
  primaryColor?: string
  accentColor?: string
  sidebarColor?: string
  faviconUrl?: string
  logoUrl?: string
}
