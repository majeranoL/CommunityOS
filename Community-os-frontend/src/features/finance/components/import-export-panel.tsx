import { useState } from 'react'
import { Download, FileUp, Loader2, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCancelImport, useConfirmImport, useExportFinance, useImportBatches, useImportPreview } from '@/features/finance/hooks/use-finance'
import { toTitleCase } from '@/lib/format'
import type { ImportKind } from '@/features/finance/types/finance'

const IMPORT_KIND_OPTIONS: Array<{ value: ImportKind; label: string }> = [
  { value: 'payments', label: 'Payments' },
  { value: 'assessments', label: 'Assessments / monthly dues' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'utility-readings', label: 'Utility meter readings' },
]

export function ImportExportPanel({ initialKind }: { initialKind?: ImportKind }) {
  const [kind, setKind] = useState<ImportKind>(initialKind ?? 'payments')
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv')
  const [importKind, setImportKind] = useState<ImportKind>(initialKind ?? 'payments')

  const exportFinance = useExportFinance()
  const preview = useImportPreview()
  const confirm = useConfirmImport()
  const cancel = useCancelImport()
  const batches = useImportBatches()

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    preview.mutate({ kind: importKind, file })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Data</Label>
                <Select value={kind} onValueChange={(value) => setKind(value as ImportKind)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select data" />
                  </SelectTrigger>
                  <SelectContent>
                    {IMPORT_KIND_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Format</Label>
                <Select value={format} onValueChange={(value) => setFormat(value as 'csv' | 'xlsx')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              type="button"
              className="w-full"
              onClick={() => exportFinance.mutate({ kind, format })}
              disabled={exportFinance.isPending}
            >
              {exportFinance.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export{' '}
              {kind === 'payments'
                ? 'payments'
                : kind === 'expenses'
                  ? 'expenses'
                  : kind === 'utility-readings'
                    ? 'utility readings'
                    : 'assessments'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Data type</Label>
              <Select value={importKind} onValueChange={(value) => setImportKind(value as ImportKind)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select data" />
                </SelectTrigger>
                <SelectContent>
                  {IMPORT_KIND_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {preview.data ? (
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="secondary">{preview.data.validRows} valid</Badge>
                  <Badge variant={preview.data.invalidRows > 0 ? 'destructive' : 'secondary'}>
                    {preview.data.invalidRows} invalid
                  </Badge>
                  {preview.data.invalidRows > 0 ? (
                    <span className="text-xs text-muted-foreground">Rows with errors will be skipped.</span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={confirm.isPending || preview.data.validRows === 0}
                    onClick={() => confirm.mutate(preview.data.batchId)}
                  >
                    {confirm.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Confirm import
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={preview.isPending}
                    onClick={() => {
                      if (preview.data) cancel.mutate(preview.data.batchId)
                      preview.reset()
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Discard
                  </Button>
                </div>
                {preview.data.invalid.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-14">Row</TableHead>
                          <TableHead>Errors</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.data.invalid.map((row) => (
                          <TableRow key={row._row}>
                            <TableCell>{row._row}</TableCell>
                            <TableCell className="text-xs text-destructive">{row.errors.join('; ')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : null}
              </div>
            ) : null}
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-sm text-muted-foreground hover:bg-accent">
              {preview.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Parsing file…
                </>
              ) : (
                <>
                  <FileUp className="h-4 w-4" />
                  Upload CSV or XLSX to preview
                </>
              )}
              <input type="file" accept=".csv,.xlsx,.xls" className="sr-only" onChange={handleFile} disabled={preview.isPending} />
            </label>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent imports</CardTitle>
        </CardHeader>
        <CardContent>
          {batches.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : batches.data?.length ? (
            <div className="space-y-2">
              {batches.data.map((batch) => (
                <div
                  key={batch.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {batch.fileName}
                      <span className="ml-2 text-xs text-muted-foreground">{toTitleCase(batch.module.replace('finance-', ''))}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(batch.createdAt).toLocaleString()} ·{' '}
                      {batch.resultCounts
                        ? `${batch.resultCounts.total} rows (${batch.resultCounts.imported ?? batch.resultCounts.valid} imported)`
                        : '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={batch.status} />
                    {batch.status === 'PROCESSING' && batch.canRollback ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={cancel.isPending}
                        onClick={() => cancel.mutate(batch.id)}
                      >
                        <RotateCcw className="h-4 w-4" />
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No imports yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
