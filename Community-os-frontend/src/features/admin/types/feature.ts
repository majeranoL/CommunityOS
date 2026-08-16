export type FeatureType = 'STANDARD' | 'OPTIONAL'

export interface Feature {
  id: string
  code: string
  name: string
  description: string | null
  type: FeatureType
  isActive: boolean
  dependencies: string[] | null
  configSchema: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
  _count?: {
    communityFeatures: number
  }
}

export interface FeatureCommunityRef {
  id: string
  code: string
  displayName: string
  status?: string
}

export interface FeatureAssignment {
  id: string
  featureId: string
  communityId: string
  enabled: boolean
  config: Record<string, unknown> | null
  enabledAt: string | null
  enabledBy: string | null
  disabledAt: string | null
  disabledBy: string | null
  createdAt: string
  updatedAt: string
  feature?: {
    id: string
    code: string
    name: string
    type: FeatureType
  }
  community?: FeatureCommunityRef
}

export interface FeatureInput {
  code: string
  name: string
  description?: string
  type?: FeatureType
  isActive?: boolean
  dependencies?: string[]
  configSchema?: Record<string, unknown>
}

export interface FeatureAssignInput {
  communityId: string
  config?: Record<string, unknown>
}

export interface FeatureUpdateInput {
  enabled?: boolean
  config?: Record<string, unknown>
}
