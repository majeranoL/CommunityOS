export interface UpcomingEvent {
  id: string
  title: string
  location: string | null
  startAt: string
  endAt: string
  status: string
}

export interface RecentComplaint {
  id: string
  complaintNumber: string
  title: string
  priority: string
  status: string
  createdAt: string
}

export interface RecentReservation {
  id: string
  purpose: string | null
  startAt: string
  endAt: string
  status: string
  facility: {
    name: string
  }
}

export interface DashboardOverview {
  counts: {
    households: number
    residents: number
    facilities: number
    vehicles: number
    staff: number
    activeVisitors: number
    announcements: number
    draftAnnouncements: number
    openComplaints: number
    pendingReservations: number
    activeMaintenance: number
    pendingPayments: number
  }
  finance: {
    totalBilled: number
    totalCollected: number
    outstanding: number
    monthlyCollected: number
    monthlyPaymentsCount: number
  }
  upcomingEvents: UpcomingEvent[]
  recentReservations: RecentReservation[]
  recentComplaints: RecentComplaint[]
  facilityStatus: Record<string, number>
}
