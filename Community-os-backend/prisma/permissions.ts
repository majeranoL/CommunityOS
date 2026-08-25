export const permissions = [
  // =====================================================
  // COMMUNITIES
  // =====================================================

  {
    code: 'community.create',
    module: 'Communities',
    description: 'Create communities',
  },
  {
    code: 'community.update',
    module: 'Communities',
    description: 'Update communities',
  },
  {
    code: 'community.delete',
    module: 'Communities',
    description: 'Delete communities',
  },
  {
    code: 'community.view',
    module: 'Communities',
    description: 'View communities',
  },
  {
    code: 'community.branding',
    module: 'Communities',
    description: 'Manage community branding and appearance',
  },

  // =====================================================
  // ANNOUNCEMENTS
  // =====================================================

  {
    code: 'announcement.create',
    module: 'Announcements',
    description: 'Create announcements',
  },
  {
    code: 'announcement.update',
    module: 'Announcements',
    description: 'Update announcements',
  },
  {
    code: 'announcement.delete',
    module: 'Announcements',
    description: 'Delete announcements',
  },
  {
    code: 'announcement.view',
    module: 'Announcements',
    description: 'View announcements',
  },
  {
    code: 'announcement.publish',
    module: 'Announcements',
    description: 'Publish announcements',
  },

  // =====================================================
  // BILLING
  // (Rename to Finance later if desired)
  // =====================================================

  {
    code: 'billing.create',
    module: 'Billing',
    description: 'Create billing',
  },
  {
    code: 'billing.update',
    module: 'Billing',
    description: 'Update billing',
  },
  {
    code: 'billing.approve',
    module: 'Billing',
    description: 'Approve billing',
  },
  {
    code: 'billing.view',
    module: 'Billing',
    description: 'View billing',
  },
  {
    code: 'billing.manage',
    module: 'Billing',
    description: 'Run billing operations',
  },

  // =====================================================
  // COMPLAINTS
  // =====================================================

  {
    code: 'complaint.create',
    module: 'Complaints',
    description: 'Create complaints',
  },
  {
    code: 'complaint.update',
    module: 'Complaints',
    description: 'Update complaints',
  },
  {
    code: 'complaint.delete',
    module: 'Complaints',
    description: 'Delete complaints',
  },
  {
    code: 'complaint.view',
    module: 'Complaints',
    description: 'View complaints',
  },
  {
    code: 'complaint.assign',
    module: 'Complaints',
    description: 'Assign complaints',
  },
  {
    code: 'complaint.resolve',
    module: 'Complaints',
    description: 'Resolve complaints',
  },
  {
    code: 'complaint.close',
    module: 'Complaints',
    description: 'Close complaints',
  },

  // =====================================================
  // RESIDENTS
  // =====================================================

  {
    code: 'resident.create',
    module: 'Residents',
    description: 'Create residents',
  },
  {
    code: 'resident.verify',
    module: 'Residents',
    description: 'Verify pending residents',
  },
  {
    code: 'resident.update',
    module: 'Residents',
    description: 'Update residents',
  },
  {
    code: 'resident.delete',
    module: 'Residents',
    description: 'Delete residents',
  },
  {
    code: 'resident.view',
    module: 'Residents',
    description: 'View residents',
  },
  {
    code: 'resident.import',
    module: 'Residents',
    description: 'Import residents',
  },
  {
    code: 'resident.export',
    module: 'Residents',
    description: 'Export residents',
  },

  // =====================================================
  // ROLES
  // =====================================================

  {
    code: 'role.manage',
    module: 'Roles',
    description: 'Manage roles',
  },
  {
    code: 'permission.manage',
    module: 'Roles',
    description: 'Manage permissions',
  },
  {
    code: 'permission.view',
    module: 'Roles',
    description: 'View permissions',
  },

  // =====================================================
  // UPLOADS
  // =====================================================

  {
    code: 'upload.file',
    module: 'Uploads',
    description: 'Upload files',
  },

  // =====================================================
  // FACILITIES
  // =====================================================

  {
    code: 'facility.create',
    module: 'Facilities',
    description: 'Create facilities',
  },
  {
    code: 'facility.update',
    module: 'Facilities',
    description: 'Update facilities',
  },
  {
    code: 'facility.delete',
    module: 'Facilities',
    description: 'Delete facilities',
  },
  {
    code: 'facility.view',
    module: 'Facilities',
    description: 'View facilities',
  },
  {
    code: 'facility.item.manage',
    module: 'Facilities',
    description: 'Manage borrowable items (create, update, delete, approve loans)',
  },
  {
    code: 'facility.item.borrow',
    module: 'Facilities',
    description: 'Request to borrow facility items and manage own requests',
  },

  // =====================================================
  // RESERVATIONS
  // =====================================================

  {
    code: 'reservation.create',
    module: 'Reservations',
    description: 'Create reservations',
  },
  {
    code: 'reservation.update',
    module: 'Reservations',
    description: 'Update reservations',
  },
  {
    code: 'reservation.delete',
    module: 'Reservations',
    description: 'Delete reservations',
  },
  {
    code: 'reservation.view',
    module: 'Reservations',
    description: 'View reservations',
  },
  {
    code: 'reservation.approve',
    module: 'Reservations',
    description: 'Approve reservations',
  },
  {
    code: 'reservation.reject',
    module: 'Reservations',
    description: 'Reject reservations',
  },
  {
    code: 'reservation.cancel',
    module: 'Reservations',
    description: 'Cancel reservations',
  },
  {
    code: 'reservation.complete',
    module: 'Reservations',
    description: 'Complete reservations',
  },

  // =====================================================
  // HOUSEHOLDS
  // =====================================================

  {
    code: 'household.create',
    module: 'Households',
    description: 'Create households',
  },
  {
    code: 'household.update',
    module: 'Households',
    description: 'Update households',
  },
  {
    code: 'household.delete',
    module: 'Households',
    description: 'Delete households',
  },
  {
    code: 'household.view',
    module: 'Households',
    description: 'View households',
  },
  {
    code: 'household.import',
    module: 'Households',
    description: 'Import households',
  },
  {
    code: 'household.export',
    module: 'Households',
    description: 'Export households',
  },

  // =====================================================
  // VISITORS
  // =====================================================

  {
    code: 'visitor.create',
    module: 'Visitors',
    description: 'Create visitors',
  },
  {
    code: 'visitor.update',
    module: 'Visitors',
    description: 'Update visitors',
  },
  {
    code: 'visitor.delete',
    module: 'Visitors',
    description: 'Delete visitors',
  },
  {
    code: 'visitor.view',
    module: 'Visitors',
    description: 'View visitors',
  },
  {
    code: 'visitor.check-in',
    module: 'Visitors',
    description: 'Check in visitors',
  },
  {
    code: 'visitor.check-out',
    module: 'Visitors',
    description: 'Check out visitors',
  },
  {
    code: 'visitor.cancel',
    module: 'Visitors',
    description: 'Cancel visitors',
  },

  // =====================================================
  // VEHICLES
  // =====================================================

  {
    code: 'vehicle.create',
    module: 'Vehicles',
    description: 'Create vehicles',
  },
  {
    code: 'vehicle.view',
    module: 'Vehicles',
    description: 'View vehicles',
  },

  // =====================================================
  // PETS
  // =====================================================

  {
    code: 'pet.create',
    module: 'Pets',
    description: 'Create pet registrations',
  },
  {
    code: 'pet.verify',
    module: 'Pets',
    description: 'Verify pending pets',
  },
  {
    code: 'pet.update',
    module: 'Pets',
    description: 'Update pet registrations',
  },
  {
    code: 'pet.delete',
    module: 'Pets',
    description: 'Delete pet registrations',
  },
  {
    code: 'pet.view',
    module: 'Pets',
    description: 'View pets',
  },
  {
    code: 'pet.import',
    module: 'Pets',
    description: 'Import pet registrations',
  },
  {
    code: 'pet.export',
    module: 'Pets',
    description: 'Export pet registrations',
  },

  // =====================================================
  // STAFF
  // =====================================================

  {
    code: 'staff.create',
    module: 'Staff',
    description: 'Create staff members',
  },
  {
    code: 'staff.update',
    module: 'Staff',
    description: 'Update staff members',
  },
  {
    code: 'staff.delete',
    module: 'Staff',
    description: 'Delete staff members',
  },
  {
    code: 'staff.view',
    module: 'Staff',
    description: 'View staff members',
  },
  {
    code: 'staff.import',
    module: 'Staff',
    description: 'Import staff members',
  },
  {
    code: 'staff.export',
    module: 'Staff',
    description: 'Export staff members',
  },

  // =====================================================
  // MAINTENANCE
  // =====================================================

  {
    code: 'maintenance.create',
    module: 'Maintenance',
    description: 'Create maintenance requests',
  },
  {
    code: 'maintenance.update',
    module: 'Maintenance',
    description: 'Update maintenance requests',
  },
  {
    code: 'maintenance.delete',
    module: 'Maintenance',
    description: 'Delete maintenance requests',
  },
  {
    code: 'maintenance.view',
    module: 'Maintenance',
    description: 'View maintenance requests',
  },
  {
    code: 'maintenance.assign',
    module: 'Maintenance',
    description: 'Assign maintenance requests',
  },
  {
    code: 'maintenance.start',
    module: 'Maintenance',
    description: 'Start maintenance requests',
  },
  {
    code: 'maintenance.resolve',
    module: 'Maintenance',
    description: 'Resolve maintenance requests',
  },
  {
    code: 'maintenance.cancel',
    module: 'Maintenance',
    description: 'Cancel maintenance requests',
  },

  // =====================================================
  // ASSESSMENTS
  // =====================================================

  {
    code: 'assessment.create',
    module: 'Assessments',
    description: 'Create assessments',
  },
  {
    code: 'assessment.update',
    module: 'Assessments',
    description: 'Update assessments',
  },
  {
    code: 'assessment.delete',
    module: 'Assessments',
    description: 'Delete assessments',
  },
  {
    code: 'assessment.view',
    module: 'Assessments',
    description: 'View assessments',
  },
  {
    code: 'assessment.issue',
    module: 'Assessments',
    description: 'Issue assessments',
  },
  {
    code: 'assessment.cancel',
    module: 'Assessments',
    description: 'Cancel assessments',
  },

  // =====================================================
  // PAYMENTS
  // =====================================================

  {
    code: 'payment.create',
    module: 'Payments',
    description: 'Create payments',
  },
  {
    code: 'payment.update',
    module: 'Payments',
    description: 'Update payments',
  },
  {
    code: 'payment.delete',
    module: 'Payments',
    description: 'Delete payments',
  },
  {
    code: 'payment.view',
    module: 'Payments',
    description: 'View payments',
  },
  {
    code: 'payment.cancel',
    module: 'Payments',
    description: 'Cancel payments',
  },

  // =====================================================
  // FINANCE
  // =====================================================

  {
    code: 'finance.view_own',
    module: 'Finance',
    description: 'View own household finance records',
  },
  {
    code: 'finance.view_all',
    module: 'Finance',
    description: 'View all finance records',
  },
  {
    code: 'finance.verify',
    module: 'Finance',
    description: 'Verify payments',
  },
  {
    code: 'finance.reject',
    module: 'Finance',
    description: 'Reject payments with reason',
  },
  {
    code: 'finance.refund',
    module: 'Finance',
    description: 'Refund payments',
  },
  {
    code: 'finance.cancel',
    module: 'Finance',
    description: 'Cancel payments',
  },
  {
    code: 'finance.import',
    module: 'Finance',
    description: 'Import finance records',
  },
  {
    code: 'finance.export',
    module: 'Finance',
    description: 'Export finance records',
  },
  {
    code: 'finance.manage',
    module: 'Finance',
    description: 'Manage charge types and billing periods',
  },
  {
    code: 'finance.waive',
    module: 'Finance',
    description: 'Waive assessments',
  },
  {
    code: 'finance.expense_view',
    module: 'Finance',
    description: 'View HOA expenses',
  },
  {
    code: 'finance.expense_create',
    module: 'Finance',
    description: 'Create expenses',
  },
  {
    code: 'finance.expense_update',
    module: 'Finance',
    description: 'Update expenses',
  },
  {
    code: 'finance.expense_delete',
    module: 'Finance',
    description: 'Delete expenses',
  },
  {
    code: 'finance.expense_import',
    module: 'Finance',
    description: 'Import expenses',
  },
  {
    code: 'finance.expense_export',
    module: 'Finance',
    description: 'Export expenses',
  },
  {
    code: 'finance.income_statement_view',
    module: 'Finance',
    description: 'View the HOA income statement',
  },

  // =====================================================
  // DOCUMENTS
  // =====================================================

  {
    code: 'document.create',
    module: 'Documents',
    description: 'Create documents',
  },
  {
    code: 'document.update',
    module: 'Documents',
    description: 'Update documents',
  },
  {
    code: 'document.delete',
    module: 'Documents',
    description: 'Delete documents',
  },
  {
    code: 'document.view',
    module: 'Documents',
    description: 'View documents',
  },
  {
    code: 'document.publish',
    module: 'Documents',
    description: 'Publish documents',
  },
  {
    code: 'document.archive',
    module: 'Documents',
    description: 'Archive documents',
  },

  // =====================================================
  // EVENTS
  // =====================================================

  {
    code: 'event.create',
    module: 'Events',
    description: 'Create events',
  },
  {
    code: 'event.update',
    module: 'Events',
    description: 'Update events',
  },
  {
    code: 'event.delete',
    module: 'Events',
    description: 'Delete events',
  },
  {
    code: 'event.view',
    module: 'Events',
    description: 'View events',
  },
  {
    code: 'event.publish',
    module: 'Events',
    description: 'Publish events',
  },
  {
    code: 'event.cancel',
    module: 'Events',
    description: 'Cancel events',
  },
  {
    code: 'event.complete',
    module: 'Events',
    description: 'Mark events as completed',
  },

  // =====================================================
  // DASHBOARD
  // =====================================================

  {
    code: 'dashboard.view',
    module: 'Dashboard',
    description: 'View dashboard overview',
  },

  // =====================================================
  // ANALYTICS
  // =====================================================

  {
    code: 'analytics.view',
    module: 'Analytics',
    description: 'View analytics',
  },

  // =====================================================
  // REPORTS
  // =====================================================

  {
    code: 'reports.export',
    module: 'Reports',
    description: 'Export report data (CSV/JSON)',
  },

  // =====================================================
  // NOTIFICATIONS
  // =====================================================

  {
    code: 'notification.view',
    module: 'Notifications',
    description: 'View notifications',
  },

  {
    code: 'notification.update',
    module: 'Notifications',
    description: 'Mark notifications as read',
  },

  // =====================================================
  // SUBSCRIPTIONS
  // =====================================================

  {
    code: 'subscription.view',
    module: 'Subscriptions',
    description: 'View subscription plans and subscription status',
  },

  {
    code: 'subscription.manage',
    module: 'Subscriptions',
    description: 'Create, update, and manage subscriptions',
  },

  // =====================================================
  // INVOICES
  // =====================================================

  {
    code: 'invoice.view',
    module: 'Invoices',
    description: 'View invoices',
  },

  {
    code: 'invoice.manage',
    module: 'Invoices',
    description: 'Create, update, and manage invoices',
  },

  // =====================================================
  // POLLS
  // =====================================================

  {
    code: 'poll.create',
    module: 'Polls',
    description: 'Create polls',
  },
  {
    code: 'poll.update',
    module: 'Polls',
    description: 'Update polls',
  },
  {
    code: 'poll.delete',
    module: 'Polls',
    description: 'Delete polls',
  },
  {
    code: 'poll.view',
    module: 'Polls',
    description: 'View polls',
  },
  {
    code: 'poll.publish',
    module: 'Polls',
    description: 'Publish polls',
  },
  {
    code: 'poll.close',
    module: 'Polls',
    description: 'Close polls',
  },
  {
    code: 'poll.vote',
    module: 'Polls',
    description: 'Vote in polls',
  },

  // =====================================================
  // AUDIT LOGS
  // =====================================================

  {
    code: 'audit.view',
    module: 'Audit Logs',
    description: 'View audit logs',
  },
  {
    code: 'audit.manage',
    module: 'Audit Logs',
    description: 'Purge audit logs',
  },

  // =====================================================
  // SETTINGS
  // =====================================================

  {
    code: 'settings.view',
    module: 'Settings',
    description: 'View community settings',
  },
  {
    code: 'settings.manage',
    module: 'Settings',
    description: 'Update community settings',
  },

  // =====================================================
  // USERS
  // =====================================================

  {
    code: 'user.create',
    module: 'Users',
    description: 'Create users',
  },
  {
    code: 'user.update',
    module: 'Users',
    description: 'Update users',
  },
  {
    code: 'user.delete',
    module: 'Users',
    description: 'Delete users',
  },
  {
    code: 'user.view',
    module: 'Users',
    description: 'View users',
  },

  // =====================================================
  // VEHICLE STICKERS
  // =====================================================

  {
    code: 'sticker.create',
    module: 'Vehicle Stickers',
    description: 'Create sticker applications',
  },
  {
    code: 'sticker.view',
    module: 'Vehicle Stickers',
    description: 'View sticker records',
  },
  {
    code: 'sticker.update',
    module: 'Vehicle Stickers',
    description: 'Edit sticker records',
  },
  {
    code: 'sticker.delete',
    module: 'Vehicle Stickers',
    description: 'Delete sticker records',
  },
  {
    code: 'sticker.verify',
    module: 'Vehicle Stickers',
    description: 'Approve or reject sticker applications',
  },
];

// Permission codes granted to the non-officer system roles (Member / Renter).
// Single source of truth shared by community provisioning
// (communities.service.ts), the seed, and the boot-time permission
// reconciler (PermissionsProvisioningService) so every path stays in sync.
export const MEMBER_PERMISSIONS: string[] = [
  'dashboard.view',
  'event.view',
  'document.view',
  'assessment.view',
  'payment.view',
  'payment.create',
  'finance.view_own',
  'finance.expense_view',
  'finance.income_statement_view',
  'announcement.view',
  'complaint.create',
  'complaint.view',
  'facility.view',
  'facility.item.borrow',
  'reservation.create',
  'reservation.view',
  'notification.view',
  'notification.update',
  'poll.view',
  'poll.vote',
  'settings.view',
  'resident.create',
  'vehicle.create',
  'vehicle.view',
  'sticker.create',
  'sticker.view',
  'pet.create',
  'pet.view',
];
