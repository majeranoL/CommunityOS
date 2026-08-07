import {
  Bell,
  Building2,
  CalendarDays,
  LayoutDashboard,
  Megaphone,
  MessageSquareWarning,
  Settings,
  Users,
  Vote,
  type LucideIcon,
} from 'lucide-react'
import { PERMISSIONS } from '@/constants/permissions'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  permission?: string
  badge?: string
}

export interface NavSection {
  label: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: PERMISSIONS.dashboardView }],
  },
  {
    label: 'Community',
    items: [
      { label: 'Users', href: '/users', icon: Users, permission: PERMISSIONS.userView },
      { label: 'Announcements', href: '/announcements', icon: Megaphone, permission: PERMISSIONS.announcementView },
      { label: 'Events', href: '/events', icon: CalendarDays, permission: PERMISSIONS.eventView },
      { label: 'Polls', href: '/polls', icon: Vote, permission: PERMISSIONS.pollView },
      { label: 'Complaints', href: '/complaints', icon: MessageSquareWarning, permission: PERMISSIONS.complaintView },
      { label: 'Facilities', href: '/facilities', icon: Building2, permission: PERMISSIONS.facilityView },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Notifications', href: '/notifications', icon: Bell, permission: PERMISSIONS.notificationView },
      { label: 'Settings', href: '/settings', icon: Settings, permission: PERMISSIONS.settingsView },
    ],
  },
]
