import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { FullPageLoader, ProtectedRoute, PublicOnlyRoute, PermissionRoute } from '@/components/route-guards'
import { PERMISSIONS } from '@/constants/permissions'

const LoginPage = lazy(() => import('@/features/auth/pages/login-page'))
const RegisterPage = lazy(() => import('@/features/auth/pages/register-page'))
const DashboardPage = lazy(() => import('@/features/dashboard/pages/dashboard-page'))
const UsersPage = lazy(() => import('@/features/users/pages/users-page'))
const SettingsPage = lazy(() => import('@/features/settings/pages/settings-page'))
const AnnouncementsPage = lazy(() => import('@/features/announcements/pages/announcements-page'))
const EventsPage = lazy(() => import('@/features/events/pages/events-page'))
const PollsPage = lazy(() => import('@/features/polls/pages/polls-page'))
const ComplaintsPage = lazy(() => import('@/features/complaints/pages/complaints-page'))
const NotificationsPage = lazy(() => import('@/features/notifications/pages/notifications-page'))
const FacilitiesPage = lazy(() => import('@/features/facilities/pages/facilities-page'))

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<FullPageLoader />}>{element}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicOnlyRoute>
        {withSuspense(<LoginPage />)}
      </PublicOnlyRoute>
    ),
  },
  {
    path: '/register',
    element: (
      <PublicOnlyRoute>
        {withSuspense(<RegisterPage />)}
      </PublicOnlyRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        path: 'dashboard',
        element: (
          <PermissionRoute permission={PERMISSIONS.dashboardView}>
            {withSuspense(<DashboardPage />)}
          </PermissionRoute>
        ),
      },
      {
        path: 'users',
        element: (
          <PermissionRoute permission={PERMISSIONS.userView}>
            {withSuspense(<UsersPage />)}
          </PermissionRoute>
        ),
      },
      {
        path: 'announcements',
        element: (
          <PermissionRoute permission={PERMISSIONS.announcementView}>
            {withSuspense(<AnnouncementsPage />)}
          </PermissionRoute>
        ),
      },
      {
        path: 'events',
        element: (
          <PermissionRoute permission={PERMISSIONS.eventView}>
            {withSuspense(<EventsPage />)}
          </PermissionRoute>
        ),
      },
      {
        path: 'polls',
        element: (
          <PermissionRoute permission={PERMISSIONS.pollView}>
            {withSuspense(<PollsPage />)}
          </PermissionRoute>
        ),
      },
      {
        path: 'complaints',
        element: (
          <PermissionRoute permission={PERMISSIONS.complaintView}>
            {withSuspense(<ComplaintsPage />)}
          </PermissionRoute>
        ),
      },
      {
        path: 'facilities',
        element: (
          <PermissionRoute permission={PERMISSIONS.facilityView}>
            {withSuspense(<FacilitiesPage />)}
          </PermissionRoute>
        ),
      },
      {
        path: 'notifications',
        element: (
          <PermissionRoute permission={PERMISSIONS.notificationView}>
            {withSuspense(<NotificationsPage />)}
          </PermissionRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <PermissionRoute permission={PERMISSIONS.settingsView}>
            {withSuspense(<SettingsPage />)}
          </PermissionRoute>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
])
