export interface StorefrontBranding {
  primaryColor: string | null
  accentColor: string | null
  sidebarColor: string | null
  logoUrl: string | null
}

export interface StorefrontCommunity {
  id: string
  code: string
  slug: string
  displayName: string
  description: string | null
  address: string | null
  branding: StorefrontBranding
  registrationOpen: boolean
}
