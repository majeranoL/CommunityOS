import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { AdminShell } from '@/components/layout/admin-shell'
import { ErrorBoundary } from '@/components/error-boundary'
import { PageTransition } from '@/components/shared/page-transition'
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
const RolesPage = lazy(() => import('@/features/roles/pages/roles-page'))
const ResidentsPage = lazy(() => import('@/features/residents/pages/residents-page'))
const HouseholdsPage = lazy(() => import('@/features/households/pages/households-page'))
const VehiclesPage = lazy(() => import('@/features/vehicles/pages/vehicles-page'))
const PetsPage = lazy(() => import('@/features/pets/pages/pets-page'))
const VehicleStickersPage = lazy(() => import('@/features/vehicle-stickers/pages/vehicle-stickers-page'))
const VisitorsPage = lazy(() => import('@/features/visitors/pages/visitors-page'))
const DocumentsPage = lazy(() => import('@/features/documents/pages/documents-page'))
const ReportsPage = lazy(() => import('@/features/reports/pages/reports-page'))
const AnalyticsPage = lazy(() => import('@/features/analytics/pages/analytics-page'))
const AuditLogsPage = lazy(() => import('@/features/audit-logs/pages/audit-logs-page'))
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
const AdminPlansPage = lazy(() => import('@/features/admin/pages/admin-plans-page'))
const AdminFeaturesPage = lazy(() => import('@/features/admin/pages/admin-features-page'))
const AdminPlatformSettingsPage = lazy(() => import('@/features/admin/pages/admin-platform-settings-page'))
const AdminMonitoringPage = lazy(() => import('@/features/admin/pages/admin-monitoring-page'))

function withSuspense(element: React.ReactNode) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<FullPageLoader />}>
        <PageTransition>{element}</PageTransition>
      </Suspense>
    </ErrorBoundary>
  )
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
        path: 'roles',
        element: (
          <PermissionRoute permission={PERMISSIONS.roleManage}>
            {withSuspense(<RolesPage />)}
          </PermissionRoute>
        ),
      },
      {
        path: 'residents',
        element: (
          <PermissionRoute permission={PERMISSIONS.residentView}>
            {withSuspense(<ResidentsPage />)}
          </PermissionRoute>
        ),
      },
      {
        path: 'households',
        element: (
          <PermissionRoute permission={PERMISSIONS.householdView}>
            {withSuspense(<HouseholdsPage />)}
          </PermissionRoute>
        ),
      },
      {
        path: 'vehicles',
        element: (
          <PermissionRoute permission={PERMISSIONS.vehicleView}>
            {withSuspense(<VehiclesPage />)}
          </PermissionRoute>
        ),
      },
      {
        path: 'stickers',
        element: (
          <PermissionRoute permission={PERMISSIONS.stickerView}>
            {withSuspense(<VehicleStickersPage />)}
          </PermissionRoute>
        ),
      },
      {
        path: 'pets',
        element: (
          <PermissionRoute permission={PERMISSIONS.petView}>
            {withSuspense(<PetsPage />)}
          </PermissionRoute>
        ),
      },
      {
        path: 'visitors',
        element: (
          <PermissionRoute permission={PERMISSIONS.visitorView}>
            {withSuspense(<VisitorsPage />)}
          </PermissionRoute>
        ),
      },
      {
        path: 'documents',
        element: (
          <PermissionRoute permission={PERMISSIONS.documentView}>
            {withSuspense(<DocumentsPage />)}
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
        path: 'reports',
        element: (
          <PermissionRoute permission={PERMISSIONS.reportsExport}>
            {withSuspense(<ReportsPage />)}
          </PermissionRoute>
        ),
      },
      {
        path: 'analytics',
        element: (
          <PermissionRoute permission={PERMISSIONS.analyticsView}>
            {withSuspense(<AnalyticsPage />)}
          </PermissionRoute>
        ),
      },
      {
        path: 'audit-logs',
        element: (
          <PermissionRoute permission={PERMISSIONS.auditView}>
            {withSuspense(<AuditLogsPage />)}
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
      {
        path: 'plans',
        element: withSuspense(<AdminPlansPage />),
      },
      {
        path: 'features',
        element: withSuspense(<AdminFeaturesPage />),
      },
      {
        path: 'settings',
        element: withSuspense(<AdminPlatformSettingsPage />),
      },
      {
        path: 'monitoring',
        element: withSuspense(<AdminMonitoringPage />),
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
