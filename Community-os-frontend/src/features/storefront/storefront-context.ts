import { createContext, useContext } from 'react'
import type { StorefrontCommunity } from '@/features/storefront/types/storefront'

export const StorefrontContext = createContext<StorefrontCommunity | null>(null)

export function useStorefront() {
  const community = useContext(StorefrontContext)
  if (!community) {
    throw new Error(
      'useStorefront must be used within a StorefrontProvider with a loaded community.',
    )
  }
  return community
}
