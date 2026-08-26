import { NavLink, useLocation, matchPath } from 'react-router-dom'
import { useAuthStore, useHasPermission } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import { NAV_SECTIONS } from '@/components/layout/nav-items'
import { useEnabledFeatures } from '@/features/features/hooks/use-enabled-features'
import { useBranding } from '@/features/branding/hooks/use-branding'
import { SecureImage } from '@/components/shared/secure-image'
import { useNavBadges } from '@/features/dashboard/hooks/use-dashboard'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { LucideIcon } from 'lucide-react'

interface SidebarProps {
  onNavigate?: () => void
}

function SidebarLink({
  to,
  icon: Icon,
  label,
  badge,
  onClick,
}: {
  to: string
  icon: LucideIcon
  label: string
  badge?: string
  onClick?: () => void
}) {
  const location = useLocation()
  const isActive = !!matchPath({ path: to, end: to === '/' }, location.pathname)

  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary transition-all duration-200" />
      )}
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {badge ? (
        <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
          {badge}
        </span>
      ) : null}
    </NavLink>
  )
}

function SidebarContent({ onNavigate }: SidebarProps) {
  const user = useAuthStore((state) => state.user)
  const isOfficer = useHasPermission(PERMISSIONS.residentVerify)
  const { data: enabledFeatures } = useEnabledFeatures()
  const { data: branding } = useBranding()
  const { data: badges } = useNavBadges()
  const enabledCodes = new Set((enabledFeatures ?? []).map((feature) => feature.code))

  const badgeMap: Record<string, string | undefined> = {
    '/app/complaints': badges?.complaints ? String(badges.complaints) : undefined,
    '/app/facilities': badges?.reservations ? String(badges.reservations) : undefined,
    '/app/announcements': badges?.announcements ? String(badges.announcements) : undefined,
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b px-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground overflow-hidden">
          {branding?.logoUrl ? (
            <SecureImage src={branding.logoUrl} className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            'C'
          )}
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">CommunityOS</p>
          <p className="text-xs text-muted-foreground">{user?.community.displayName ?? ''}</p>
        </div>
      </div>
      <ScrollArea className="flex-1 px-3 py-3">
        <nav className="flex flex-col gap-6">
          {NAV_SECTIONS.map((section) => {
            const visible = section.items.filter(
              (item) => {
                if (!item.permission || user?.permissions.includes(item.permission)) {
                  if (item.feature && !enabledCodes.has(item.feature)) return false
                  if (!isOfficer && item.href === '/app/households') return false
                  return true
                }
                return false
              },
            )
            if (visible.length === 0) return null
            return (
              <div key={section.label} className="space-y-1">
                <p className="px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {section.label}
                </p>
                {visible.map((item) => (
                  <SidebarLink
                    key={item.href}
                    to={item.href}
                    icon={item.icon}
                    label={item.label}
                    badge={badgeMap[item.href] ?? item.badge}
                    onClick={onNavigate}
                  />
                ))}
              </div>
            )
          })}
        </nav>
      </ScrollArea>
      <div className="border-t p-3">
        <p className="px-3 text-xs text-muted-foreground">
          CommunityOS · v0.1
        </p>
      </div>
    </div>
  )
}

export function SidebarDesktop() {
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-sidebar lg:block">
      <SidebarContent />
    </aside>
  )
}

export function SidebarMobile({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 lg:hidden',
        open ? 'pointer-events-auto' : 'pointer-events-none',
      )}
    >
      <div
        className={cn(
          'absolute inset-0 bg-black/50 transition-opacity',
          open ? 'opacity-100' : 'opacity-0',
        )}
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          'absolute inset-y-0 left-0 w-72 border-r bg-sidebar transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <SidebarContent onNavigate={() => onOpenChange(false)} />
      </div>
    </div>
  )
}
