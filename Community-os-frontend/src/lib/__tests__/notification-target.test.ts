import { describe, expect, it } from 'vitest'
import { notificationTarget } from '@/lib/notification-target'

describe('notificationTarget', () => {
  it('maps my-dues links to the finance page with the dues tab', () => {
    expect(notificationTarget('/finance/my-dues')).toEqual({
      pathname: '/app/finance',
      search: '?tab=my-dues',
    })
    expect(notificationTarget('/my-dues')).toEqual({
      pathname: '/app/finance',
      search: '?tab=my-dues',
    })
  })

  it('maps module records to the app-scoped page with a view param', () => {
    for (const module of ['announcements', 'events', 'polls', 'complaints', 'facilities']) {
      expect(notificationTarget(`/${module}/abc-123`)).toEqual({
        pathname: `/app/${module}`,
        search: '?view=abc-123',
      })
    }
  })

  it('maps stickers to the vehicle stickers page', () => {
    expect(notificationTarget('/stickers/abc-123')).toEqual({
      pathname: '/app/stickers',
      search: '?view=abc-123',
    })
  })

  it('maps reservations to the facilities reservations tab', () => {
    expect(notificationTarget('/reservations/abc-123')).toEqual({
      pathname: '/app/facilities',
      search: '?tab=reservations&view=abc-123',
    })
  })

  it('maps payments to the finance payments tab with the record to open', () => {
    expect(notificationTarget('/payments/abc-123')).toEqual({
      pathname: '/app/finance',
      search: '?tab=payments&view=abc-123',
    })
  })

  it('returns null for maintenance links (no navigation)', () => {
    expect(notificationTarget('/maintenance/abc-123')).toBeNull()
  })

  it('returns null for unknown or malformed links', () => {
    expect(notificationTarget('/unknown/abc-123')).toBeNull()
    expect(notificationTarget('/unknown')).toBeNull()
  })

  it('returns null for missing links', () => {
    expect(notificationTarget(null)).toBeNull()
    expect(notificationTarget('')).toBeNull()
  })

  it('tolerates an /app prefix on links', () => {
    expect(notificationTarget('/app/payments/abc-123')).toEqual({
      pathname: '/app/finance',
      search: '?tab=payments&view=abc-123',
    })
  })
})