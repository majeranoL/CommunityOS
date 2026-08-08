import {
  Bell,
  Building2,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Megaphone,
  MessageSquareWarning,
  Settings,
  Users,
  Vote,
  Wallet,
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
    items: [{ label: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard, permission: PERMISSIONS.dashboardView }],
  },
  {
    label: 'Community',
    items: [{ label: 'Users', href: '/app/users', icon: Users, permission: PERMISSIONS.userView }],
  },
  {
    label: 'Communication',
    items: [
      { label: 'Announcements', href: '/app/announcements', icon: Megaphone, permission: PERMISSIONS.announcementView },
      { label: 'Events', href: '/app/events', icon: CalendarDays, permission: PERMISSIONS.eventView },
      { label: 'Polls', href: '/app/polls', icon: Vote, permission: PERMISSIONS.pollView },
      { label: 'Notifications', href: '/app/notifications', icon: Bell, permission: PERMISSIONS.notificationView },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Complaints', href: '/app/complaints', icon: MessageSquareWarning, permission: PERMISSIONS.complaintView },
      { label: 'Facilities', href: '/app/facilities', icon: Building2, permission: PERMISSIONS.facilityView },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Finance', href: '/app/finance', icon: Wallet, permission: PERMISSIONS.assessmentView },
      { label: 'Billing', href: '/app/billing', icon: CreditCard, permission: PERMISSIONS.billingView },
    ],
  },
  {
    label: 'Intelligence',
    items: [{ label: 'Settings', href: '/app/settings', icon: Settings, permission: PERMISSIONS.settingsView }],
  },
]
