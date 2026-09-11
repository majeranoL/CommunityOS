import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  CreditCard,
  DollarSign,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Puzzle,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import { useSecureImageUrl } from '@/components/shared/secure-image'
import { authService } from '@/features/auth/services/auth'
import { initials } from '@/lib/format'

const ADMIN_NAV = [
  { label: 'Overview', href: '/admin/overview', icon: LayoutDashboard },
  { label: 'Communities', href: '/admin/communities', icon: Building2 },
  { label: 'Plans', href: '/admin/plans', icon: CreditCard },
  { label: 'Revenue', href: '/admin/revenue', icon: DollarSign },
  { label: 'Invoices', href: '/admin/invoices', icon: FileText },
  { label: 'Features', href: '/admin/features', icon: Puzzle },
  { label: 'System Health', href: '/admin/monitoring', icon: ShieldCheck },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
  { label: 'Payment methods', href: '/admin/payment-methods', icon: Wallet },
  { label: 'Provision', href: '/admin/communities/new', icon: Users },
]

function AdminSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          C
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">CommunityOS</p>
          <p className="text-xs text-muted-foreground">Platform Admin</p>
        </div>
      </div>
      <ScrollArea className="flex-1 px-3 py-3">
        <nav className="flex flex-col gap-1">
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </ScrollArea>
      <div className="border-t p-3">
        <p className="px-3 text-xs text-muted-foreground">CommunityOS · Platform</p>
      </div>
    </div>
  )
}

function AdminTopbar({ onMenuClick }: { onMenuClick: () => void }) {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const clear = useAuthStore((state) => state.clear)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const avatarUrl = useSecureImageUrl(user?.avatarUrl)

  const handleLogout = async () => {
    setDropdownOpen(false)
    try {
      await authService.logout()
    } finally {
      clear()
      navigate('/login', { replace: true })
    }
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card/60 px-4 backdrop-blur sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          C
        </div>
        <div className="hidden leading-tight sm:block">
          <p className="text-sm font-semibold">CommunityOS Admin</p>
          <p className="text-xs text-muted-foreground">Platform operations</p>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="hidden items-center gap-1.5 sm:flex"
          onClick={() => navigate('/app/dashboard')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to app
        </Button>

        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={avatarUrl} alt={user?.firstName} />
                <AvatarFallback>{initials(user?.firstName, user?.lastName)}</AvatarFallback>
              </Avatar>
              <span className="hidden text-left sm:block">
                <p className="text-sm font-medium leading-tight">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/app/dashboard')}>Back to app</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

export function AdminShell() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden w-64 shrink-0 border-r bg-sidebar lg:block">
        <AdminSidebarContent />
      </aside>
      <div
        className={cn('fixed inset-0 z-50 lg:hidden', mobileOpen ? 'pointer-events-auto' : 'pointer-events-none')}
      >
        <div
          className={cn('absolute inset-0 bg-black/50 transition-opacity', mobileOpen ? 'opacity-100' : 'opacity-0')}
          onClick={() => setMobileOpen(false)}
        />
        <div
          className={cn(
            'absolute inset-y-0 left-0 w-72 border-r bg-sidebar transition-transform duration-300',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <AdminSidebarContent onNavigate={() => setMobileOpen(false)} />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
