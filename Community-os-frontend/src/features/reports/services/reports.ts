import api from '@/lib/api'

export type ReportType =
  | 'residents'
  | 'households'
  | 'payments'
  | 'assessments'
  | 'complaints'
  | 'vehicles'
  | 'maintenance'
  | 'visitors'
  | 'events'
  | 'expenses'
  | 'reservations'
  | 'staff'

export async function downloadReport(type: ReportType, month?: string) {
  const { data, headers } = await api.get<Blob>(`/reports/${type}`, {
    params: {
      format: 'csv',
      ...(month ? { month } : {}),
    },
    responseType: 'blob',
  })

  const disposition = (headers['content-disposition'] as string | undefined) ?? ''
  const match = disposition.match(/filename="?([^";]+)"?/i)
  const filename = match?.[1] ?? `${type}.csv`

  const url = URL.createObjectURL(data)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
