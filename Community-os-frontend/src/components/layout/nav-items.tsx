import {
  Building2,
  CalendarDays,
  Car,
  ChartPie,
  CreditCard,
  DoorOpen,
  FileSpreadsheet,
  History,
  Home,
  LayoutDashboard,
  Megaphone,
  MessageSquareWarning,
  PawPrint,
  ScanLine,
  Settings,
  ShieldCheck,
  StickyNote,
  Users,
  UserRound,
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
  feature?: string
  badge?: string
}

export interface NavSection {
  label: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Overview',
    items: [
      {
        label: 'Dashboard',
        href: '/app/dashboard',
        icon: LayoutDashboard,
        permission: PERMISSIONS.dashboardView,
      },
    ],
  },
  {
    label: 'Community',
    items: [
      {
        label: 'Users',
        href: '/app/users',
        icon: Users,
        permission: PERMISSIONS.userView,
      },
      {
        label: 'Roles',
        href: '/app/roles',
        icon: ShieldCheck,
        permission: PERMISSIONS.roleManage,
      },
      {
        label: 'Residents',
        href: '/app/residents',
        icon: UserRound,
        permission: PERMISSIONS.residentView,
      },
      {
        label: 'Households',
        href: '/app/households',
        icon: Home,
        permission: PERMISSIONS.householdView,
      },
      {
        label: 'Vehicles',
        href: '/app/vehicles',
        icon: Car,
        permission: PERMISSIONS.vehicleView,
      },
      {
        label: 'Stickers',
        href: '/app/stickers',
        icon: StickyNote,
        permission: PERMISSIONS.stickerView,
        feature: 'vehicle-stickers',
      },
      {
        label: 'Pets',
        href: '/app/pets',
        icon: PawPrint,
        permission: PERMISSIONS.petView,
        feature: 'pet-registration',
      },
      {
        label: 'Visitors',
        href: '/app/visitors',
        icon: DoorOpen,
        permission: PERMISSIONS.visitorView,
      },
    ],
  },
  {
    label: 'Communication',
    items: [
      {
        label: 'Announcements',
        href: '/app/announcements',
        icon: Megaphone,
        permission: PERMISSIONS.announcementView,
      },
      {
        label: 'Events',
        href: '/app/events',
        icon: CalendarDays,
        permission: PERMISSIONS.eventView,
      },
      {
        label: 'Polls',
        href: '/app/polls',
        icon: Vote,
        permission: PERMISSIONS.pollView,
      },
    ],
  },
  {
    label: 'Operations',
    items: [
      {
        label: 'Complaints',
        href: '/app/complaints',
        icon: MessageSquareWarning,
        permission: PERMISSIONS.complaintView,
      },
      {
        label: 'Facilities',
        href: '/app/facilities',
        icon: Building2,
        permission: PERMISSIONS.facilityView,
      },
      {
        label: 'Gate',
        href: '/app/gate',
        icon: ScanLine,
        permission: PERMISSIONS.visitorCheckIn,
        feature: 'good-bad-standing',
      },
    ],
  },
  {
    label: 'Finance',
    items: [
      {
        label: 'Finance',
        href: '/app/finance',
        icon: Wallet,
        permission: PERMISSIONS.assessmentView,
      },
      {
        label: 'Billing',
        href: '/app/billing',
        icon: CreditCard,
        permission: PERMISSIONS.billingView,
      },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      {
        label: 'Analytics',
        href: '/app/analytics',
        icon: ChartPie,
        permission: PERMISSIONS.analyticsView,
      },
      {
        label: 'Reports',
        href: '/app/reports',
        icon: FileSpreadsheet,
        permission: PERMISSIONS.reportsExport,
      },
      {
        label: 'Audit Logs',
        href: '/app/audit-logs',
        icon: History,
        permission: PERMISSIONS.auditView,
      },
      {
        label: 'Settings',
        href: '/app/settings',
        icon: Settings,
        permission: PERMISSIONS.settingsView,
      },
    ],
  },
]
