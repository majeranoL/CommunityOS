interface NotificationTarget {
  pathname: string
  search: string
}

export function notificationTarget(link: string | null): NotificationTarget | null {
  if (!link) return null
  const segments = link.split('/').filter(Boolean)
  const [module, id] = segments
  if (!module || !id) return null

  if (module === 'reservations') {
    return {
      pathname: '/facilities',
      search: `?tab=reservations&view=${encodeURIComponent(id)}`,
    }
  }

  return {
    pathname: `/${module}`,
    search: `?view=${encodeURIComponent(id)}`,
  }
}
