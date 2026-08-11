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
    code: 'vehicle.update',
    module: 'Vehicles',
    description: 'Update vehicles',
  },
  {
    code: 'vehicle.delete',
    module: 'Vehicles',
    description: 'Delete vehicles',
  },
  {
    code: 'vehicle.view',
    module: 'Vehicles',
    description: 'View vehicles',
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
    code: 'payment.confirm',
    module: 'Payments',
    description: 'Confirm payments',
  },
  {
    code: 'payment.reject',
    module: 'Payments',
    description: 'Reject payments',
  },
  {
    code: 'payment.refund',
    module: 'Payments',
    description: 'Refund payments',
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
];
