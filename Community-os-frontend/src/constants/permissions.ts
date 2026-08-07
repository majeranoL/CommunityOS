export const PERMISSIONS = {
  dashboardView: 'dashboard.view',

  userCreate: 'user.create',
  userView: 'user.view',
  userUpdate: 'user.update',
  userDelete: 'user.delete',

  announcementCreate: 'announcement.create',
  announcementView: 'announcement.view',
  announcementUpdate: 'announcement.update',
  announcementDelete: 'announcement.delete',

  eventCreate: 'event.create',
  eventView: 'event.view',
  eventUpdate: 'event.update',
  eventDelete: 'event.delete',
  eventPublish: 'event.publish',
  eventCancel: 'event.cancel',
  eventComplete: 'event.complete',

  pollCreate: 'poll.create',
  pollView: 'poll.view',
  pollUpdate: 'poll.update',
  pollDelete: 'poll.delete',
  pollPublish: 'poll.publish',
  pollClose: 'poll.close',
  pollVote: 'poll.vote',

  complaintCreate: 'complaint.create',
  complaintView: 'complaint.view',
  complaintUpdate: 'complaint.update',
  complaintDelete: 'complaint.delete',
  complaintAssign: 'complaint.assign',
  complaintResolve: 'complaint.resolve',

  notificationView: 'notification.view',
  notificationUpdate: 'notification.update',

  settingsView: 'settings.view',
  settingsUpdate: 'settings.update',

  facilityView: 'facility.view',
  facilityCreate: 'facility.create',
  facilityUpdate: 'facility.update',
  facilityDelete: 'facility.delete',

  reservationView: 'reservation.view',
  reservationCreate: 'reservation.create',
  reservationUpdate: 'reservation.update',
  reservationDelete: 'reservation.delete',
  reservationApprove: 'reservation.approve',
  reservationReject: 'reservation.reject',
  reservationCancel: 'reservation.cancel',
  reservationComplete: 'reservation.complete',
} as const

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
