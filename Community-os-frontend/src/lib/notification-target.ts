interface NotificationTarget {
  pathname: string
  search: string
}

export function notificationTarget(link: string | null): NotificationTarget | null {
  if (!link) return null

  if (link === '/finance/my-dues' || link.startsWith('/finance/my-dues?') || link === '/my-dues') {
    return {
      pathname: '/app/finance',
      search: '?tab=my-dues',
    }
  }

  const segments = link.split('/').filter(Boolean)
  const [module, id] = segments
  if (!module || !id) return null

  if (module === 'reservations') {
    return {
      pathname: '/facilities',
      search: `?tab=reservations&view=${encodeURIComponent(id)}`,
    }
  }

  if (module === 'stickers') {
    return {
      pathname: '/app/stickers',
      search: `?view=${encodeURIComponent(id)}`,
    }
  }

  return {
    pathname: `/${module}`,
    search: `?view=${encodeURIComponent(id)}`,
  }
}
