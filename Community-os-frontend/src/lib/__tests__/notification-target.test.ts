import { describe, expect, it } from 'vitest'
import { notificationTarget } from '@/lib/notification-target'

describe('notificationTarget', () => {
  it('maps my-dues links to the finance page with the dues tab', () => {
    expect(notificationTarget('/finance/my-dues')).toEqual({
      pathname: '/app/finance',
      search: '?tab=my-dues',
    })
  })

  it('maps announcements to the dashboard view', () => {
    expect(notificationTarget('/announcements/abc-123')).toEqual({
      pathname: '/announcements',
      search: '?view=abc-123',
    })
  })

  it('returns null for missing links', () => {
    expect(notificationTarget(null)).toBeNull()
    expect(notificationTarget('')).toBeNull()
  })
})