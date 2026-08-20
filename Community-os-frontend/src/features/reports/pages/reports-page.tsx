import { useState } from 'react'
import {
  Briefcase,
  CalendarDays,
  Car,
  CreditCard,
  DoorOpen,
  Download,
  Home,
  MessageSquareWarning,
  Receipt,
  ReceiptText,
  UserRound,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import { useHasPermission } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import { downloadReport, type ReportType } from '@/features/reports/services/reports'

interface ReportDef {
  key: ReportType
  title: string
  description: string
  icon: LucideIcon
  month?: boolean
}

const REPORTS: ReportDef[] = [
  {
    key: 'residents',
    title: 'Residents',
    description: 'Directory of all residents with household and contact details.',
    icon: Users,
  },
  {
    key: 'households',
    title: 'Households',
    description: 'All households with resident and assessment counts.',
    icon: Home,
  },
  {
    key: 'payments',
    title: 'Payments',
    description: 'All payments, optionally filtered by month.',
    icon: CreditCard,
    month: true,
  },
  {
    key: 'assessments',
    title: 'Assessments',
    description: 'Assessments with amounts, paid, outstanding, and due dates.',
    icon: Receipt,
  },
  {
    key: 'complaints',
    title: 'Complaints',
    description: 'Complaints with category, priority, status, and assignment.',
    icon: MessageSquareWarning,
  },
  {
    key: 'vehicles',
    title: 'Vehicles',
    description: 'Registered vehicles with owner and plate details.',
    icon: Car,
  },
  {
    key: 'maintenance',
    title: 'Maintenance',
    description: 'Requests with category, staff assignment, and cost.',
    icon: Wrench,
  },
  {
    key: 'visitors',
    title: 'Visitors',
    description: 'Gate log with visitor, host, and vehicle details.',
    icon: DoorOpen,
  },
  {
    key: 'events',
    title: 'Events',
    description: 'Published events with organizer and schedule.',
    icon: CalendarDays,
  },
  {
    key: 'expenses',
    title: 'Expenses',
    description: 'All expenses with category, amount, and payee details.',
    icon: ReceiptText,
  },
  {
    key: 'reservations',
    title: 'Reservations',
    description: 'Facility reservations with resident and schedule.',
    icon: Wallet,
  },
  {
    key: 'staff',
    title: 'Staff',
    description: 'Staff directory with role, contact, and hire details.',
    icon: Briefcase,
  },
]

export default function ReportsPage() {
  const [month, setMonth] = useState('')
  const [exporting, setExporting] = useState<ReportType | null>(null)

  const canExport = useHasPermission(PERMISSIONS.reportsExport)

  const handleExport = async (report: ReportDef) => {
    if (!canExport) return
    setExporting(report.key)
    try {
      await downloadReport(report.key, report.month ? month || undefined : undefined)
      toast.success(`${report.title} export downloaded.`)
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Export failed.'))
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Export CSV snapshots of your community data." />

      {canExport ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REPORTS.map((report) => {
            const Icon = report.icon
            const isExporting = exporting === report.key
            return (
              <Card key={report.key} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base">{report.title}</CardTitle>
                      <CardDescription>{report.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="mt-auto space-y-3 pt-0">
                  {report.month ? (
                    <Input
                      type="month"
                      value={month}
                      onChange={(event) => setMonth(event.target.value)}
                      aria-label="Filter payments by month"
                    />
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleExport(report)}
                    disabled={isExporting}
                  >
                    <Download className="h-4 w-4" />
                    {isExporting ? 'Exporting…' : 'Export CSV'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
            <UserRound className="h-4 w-4" />
            You don&apos;t have permission to export reports.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
