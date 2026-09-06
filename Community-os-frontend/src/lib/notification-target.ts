interface NotificationTarget {
  pathname: string
  search: string
}

const MODULE_PAGES: Record<string, string> = {
  announcements: 'announcements',
  events: 'events',
  polls: 'polls',
  complaints: 'complaints',
  facilities: 'facilities',
  stickers: 'stickers',
}

export function notificationTarget(link: string | null): NotificationTarget | null {
  if (!link) return null

  const trimmed = link.startsWith('/') ? link : `/${link}`
  const path = trimmed.startsWith('/app/')
    ? trimmed.slice('/app'.length) || '/'
    : trimmed

  if (
    path === '/finance/my-dues' ||
    path.startsWith('/finance/my-dues?') ||
    path === '/my-dues'
  ) {
    return {
      pathname: '/app/finance',
      search: '?tab=my-dues',
    }
  }

  const segments = path.split('/').filter(Boolean)
  const [module, id] = segments
  if (!module || !id) return null

  if (module === 'reservations') {
    return {
      pathname: '/app/facilities',
      search: `?tab=reservations&view=${encodeURIComponent(id)}`,
    }
  }

  if (module === 'stickers') {
    return {
      pathname: '/app/stickers',
      search: `?view=${encodeURIComponent(id)}`,
    }
  }

  if (module === 'payments') {
    return {
      pathname: '/app/finance',
      search: `?tab=payments&view=${encodeURIComponent(id)}`,
    }
  }

  const page = MODULE_PAGES[module]
  if (!page) return null

  return {
    pathname: `/app/${page}`,
    search: `?view=${encodeURIComponent(id)}`,
  }
}