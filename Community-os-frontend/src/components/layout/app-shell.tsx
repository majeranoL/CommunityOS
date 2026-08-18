import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { SidebarDesktop, SidebarMobile } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SidebarDesktop />
      <SidebarMobile open={mobileOpen} onOpenChange={setMobileOpen} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
            <div key={location.pathname} className="animate-page-enter">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
