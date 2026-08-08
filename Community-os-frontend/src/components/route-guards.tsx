import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'

export function FullPageLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
        C
      </div>
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading CommunityOS…
      </p>
    </div>
  )
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuthStore()
  const location = useLocation()

  if (status === 'loading' || status === 'idle') {
    return <FullPageLoader />
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { status } = useAuthStore()
  const user = useAuthStore((state) => state.user)

  if (status === 'loading' || status === 'idle') {
    return <FullPageLoader />
  }

  if (status === 'authenticated') {
    return <Navigate to={user?.isPlatformAdmin ? '/admin' : '/app/dashboard'} replace />
  }

  return children
}

export function PlatformAdminRoute({ children }: { children: ReactNode }) {
  const { status } = useAuthStore()
  const user = useAuthStore((state) => state.user)
  const location = useLocation()

  if (status === 'loading' || status === 'idle') {
    return <FullPageLoader />
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!user?.isPlatformAdmin) {
    return <Navigate to="/app/dashboard" replace />
  }

  return children
}

export function PermissionRoute({
  permission,
  children,
}: {
  permission: string
  children: ReactNode
}) {
  const user = useAuthStore((state) => state.user)

  if (!user?.permissions.includes(permission)) {
    return <Navigate to="/app/dashboard" replace />
  }

  return children
}
