export interface FinancialAnalytics {
  month: string
  period: {
    billed: number
    billedCount: number
    collected: number
    collectedCount: number
    pending: number
    pendingCount: number
  }
  overall: {
    totalBilled: number
    totalCollected: number
    outstanding: number
    collectionRate: number
    assessmentsCount: number
    statusBreakdown: Record<string, number>
  }
}

export interface TrendRow {
  month: string
  billed: number
  collected: number
  complaints: number
  maintenance: number
}

export type StatusBreakdownEntity =
  | 'complaints'
  | 'maintenance'
  | 'reservations'
  | 'visitors'
  | 'vehicles'
  | 'staff'
  | 'facilities'
  | 'assessments'
  | 'payments'
  | 'events'

export type StatusBreakdown = Record<StatusBreakdownEntity, Record<string, number>>
