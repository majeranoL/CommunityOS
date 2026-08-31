import { Outlet, Navigate, useParams } from 'react-router-dom'
import { StorefrontProvider } from '@/features/storefront/components/storefront-provider'
import { useStorefrontCommunity } from '@/features/storefront/hooks/use-storefront'
import { FullPageLoader } from '@/components/route-guards'

export function StorefrontLayout() {
  const { slug } = useParams<{ slug: string }>()
  const { data, isLoading, isError } = useStorefrontCommunity(slug)

  if (isLoading || !slug) {
    return <FullPageLoader />
  }

  if (isError || !data) {
    return <Navigate to="/" replace />
  }

  return (
    <StorefrontProvider slug={slug}>
      <Outlet />
    </StorefrontProvider>
  )
}
