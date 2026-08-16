export type FeatureType = 'STANDARD' | 'OPTIONAL'

export interface EnabledFeature {
  id: string
  code: string
  name: string
  description: string | null
  type: FeatureType
  config: Record<string, unknown>
}
