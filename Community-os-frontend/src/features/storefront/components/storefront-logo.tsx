import type { StorefrontCommunity } from '@/features/storefront/types/storefront'
import { cn } from '@/lib/utils'

export function StorefrontLogo({
  community,
  className,
}: {
  community: StorefrontCommunity
  className?: string
}) {
  const logoUrl = community.branding.logoUrl
  const initial = community.displayName.trim().charAt(0).toUpperCase() || 'C'

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`${community.displayName} logo`}
        className={cn('h-9 w-9 rounded-lg object-cover', className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground',
        className,
      )}
    >
      {initial}
    </div>
  )
}
