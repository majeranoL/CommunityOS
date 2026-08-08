import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { AdminShell } from '@/components/layout/admin-shell'
import {
  FullPageLoader,
  ProtectedRoute,
  PublicOnlyRoute,
  PermissionRoute,
  PlatformAdminRoute,
} from '@/components/route-guards'
import { PERMISSIONS } from '@/constants/permissions'

const LandingPage = lazy(() => import('@/features/landing/pages/landing-page'))
const GetStartedPage = lazy(() => import('@/features/get-started/pages/get-started-page'))
const LoginPage = lazy(() => import('@/features/auth/pages/login-page'))
const RegisterPage = lazy(() => import('@/features/auth/pages/register-page'))
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/forgot-password-page'))
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/reset-password-page'))
const DashboardPage = lazy(() => import('@/features/dashboard/pages/dashboard-page'))
const UsersPage = lazy(() => import('@/features/users/pages/users-page'))
const SettingsPage = lazy(() => import('@/features/settings/pages/settings-page'))
const AnnouncementsPage = lazy(() => import('@/features/announcements/pages/announcements-page'))
const EventsPage = lazy(() => import('@/features/events/pages/events-page'))
const PollsPage = lazy(() => import('@/features/polls/pages/polls-page'))
const ComplaintsPage = lazy(() => import('@/features/complaints/pages/complaints-page'))
const NotificationsPage = lazy(() => import('@/features/notifications/pages/notifications-page'))
const FacilitiesPage = lazy(() => import('@/features/facilities/pages/facilities-page'))
const BillingPage = lazy(() => import('@/features/billing/pages/billing-page'))
const FinancePage = lazy(() => import('@/features/finance/pages/finance-page'))
const AdminOverviewPage = lazy(() => import('@/features/admin/pages/admin-overview-page'))
const AdminCommunitiesPage = lazy(() => import('@/features/admin/pages/admin-communities-page'))
const AdminCommunityDetailPage = lazy(() => import('@/features/admin/pages/admin-community-detail-page'))
const AdminProvisionPage = lazy(() => import('@/features/admin/pages/admin-provision-page'))

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<FullPageLoader />}>{element}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: withSuspense(<LandingPage />),
  },
  {
    path: '/get-started',
    element: (
      <PublicOnlyRoute>
        {withSuspense(<GetStartedPage />)}
      </PublicOnlyRoute>
    ),
  },
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
    path: '/forgot-password',
    element: (
      <PublicOnlyRoute>
        {withSuspense(<ForgotPasswordPage />)}
      </PublicOnlyRoute>
    ),
  },
  {
    path: '/reset-password',
    element: withSuspense(<ResetPasswordPage />),
  },
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
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
      {
        path: 'billing',
        element: (
          <PermissionRoute permission={PERMISSIONS.billingView}>
            {withSuspense(<BillingPage />)}
          </PermissionRoute>
        ),
      },
      {
        path: 'finance',
        element: (
          <PermissionRoute permission={PERMISSIONS.assessmentView}>
            {withSuspense(<FinancePage />)}
          </PermissionRoute>
        ),
      },
    ],
  },
  {
    path: '/admin',
    element: (
      <PlatformAdminRoute>
        <AdminShell />
      </PlatformAdminRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/overview" replace /> },
      {
        path: 'overview',
        element: withSuspense(<AdminOverviewPage />),
      },
      {
        path: 'communities',
        element: withSuspense(<AdminCommunitiesPage />),
      },
      {
        path: 'communities/:id',
        element: withSuspense(<AdminCommunityDetailPage />),
      },
      {
        path: 'communities/new',
        element: withSuspense(<AdminProvisionPage />),
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
