import { useState } from 'react'
import { NavLink, useLocation, matchPath } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useAuthStore, useHasPermission } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import { NAV_SECTIONS, NOTIFICATION_BADGE_TYPES } from '@/components/layout/nav-items'
import { useEnabledFeatures } from '@/features/features/hooks/use-enabled-features'
import { useBranding } from '@/features/branding/hooks/use-branding'
import { SecureImage } from '@/components/shared/secure-image'
import { useNotificationBadges } from '@/features/notifications/hooks/use-notifications'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { LucideIcon } from 'lucide-react'
import type { NavItem } from '@/components/layout/nav-items'

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

function SidebarGroup({
  to,
  icon: Icon,
  label,
  badge,
  children,
  badgeMap,
  onNavigate,
}: {
  to: string
  icon: LucideIcon
  label: string
  badge?: string
  children: NavItem[]
  badgeMap: Record<string, string | undefined>
  onNavigate?: () => void
}) {
  const location = useLocation()
  const isActive = !!matchPath({ path: to, end: true }, location.pathname)
  const isChildActive = children.some((child) =>
    matchPath({ path: child.href, end: true }, location.pathname),
  )
  const [expanded, setExpanded] = useState(
    () => isActive || isChildActive,
  )
  const open = expanded || isChildActive

  return (
    <div>
      <NavLink
        to={to}
        onClick={onNavigate}
        className={cn(
          'relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isActive || isChildActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        )}
      >
        {(isActive || isChildActive) && (
          <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary transition-all duration-200" />
        )}
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1">{label}</span>
        {badgeMap[to] ?? badge ? (
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
            {badgeMap[to] ?? badge}
          </span>
        ) : null}
        <button
          type="button"
          aria-label={`${open ? 'Collapse' : 'Expand'} ${label}`}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setExpanded((value) => !value)
          }}
          className="rounded p-0.5 transition-transform hover:text-foreground"
        >
          <ChevronRight
            className={cn('h-4 w-4 transition-transform', open && 'rotate-90')}
          />
        </button>
      </NavLink>
      {open ? (
        <div className="mt-1 space-y-1 pl-9">
          {children.map((child) => (
            <SidebarLink
              key={child.href}
              to={child.href}
              icon={child.icon}
              label={child.label}
              badge={badgeMap[child.href] ?? child.badge}
              onClick={onNavigate}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function SidebarContent({ onNavigate }: SidebarProps) {
  const user = useAuthStore((state) => state.user)
  const isOfficer = useHasPermission(PERMISSIONS.residentVerify)
  const { data: enabledFeatures } = useEnabledFeatures()
  const { data: branding } = useBranding()
  const { data: badges } = useNotificationBadges()
  const enabledCodes = new Set((enabledFeatures ?? []).map((feature) => feature.code))

  const badgeMap: Record<string, string | undefined> = {}
  for (const [href, types] of Object.entries(NOTIFICATION_BADGE_TYPES)) {
    const count = types.reduce(
      (total, type) => total + (badges?.[type] ?? 0),
      0,
    )
    if (count > 0) badgeMap[href] = String(count)
  }

  const isItemVisible = (item: NavItem) => {
    if (item.permission && !user?.permissions.includes(item.permission)) {
      return false
    }
    if (item.feature && !enabledCodes.has(item.feature)) return false
    if (!isOfficer && item.href === '/app/households') return false
    return true
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
            const visible = section.items.filter(isItemVisible)
            if (visible.length === 0) return null
            return (
              <div key={section.label} className="space-y-1">
                <p className="px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {section.label}
                </p>
                {visible.map((item) => {
                  if (item.children?.length) {
                    const children = item.children.filter(isItemVisible)
                    if (children.length === 0) {
                      return (
                        <SidebarLink
                          key={item.href}
                          to={item.href}
                          icon={item.icon}
                          label={item.label}
                          badge={badgeMap[item.href] ?? item.badge}
                          onClick={onNavigate}
                        />
                      )
                    }
                    return (
                      <SidebarGroup
                        key={item.href}
                        to={item.href}
                        icon={item.icon}
                        label={item.label}
                        badge={item.badge}
                        children={children}
                        badgeMap={badgeMap}
                        onNavigate={onNavigate}
                      />
                    )
                  }
                  return (
                    <SidebarLink
                      key={item.href}
                      to={item.href}
                      icon={item.icon}
                      label={item.label}
                      badge={badgeMap[item.href] ?? item.badge}
                      onClick={onNavigate}
                    />
                  )
                })}
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
