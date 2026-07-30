export const permissions = [
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