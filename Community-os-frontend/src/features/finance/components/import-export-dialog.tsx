import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ImportExportPanel } from '@/features/finance/components/import-export-panel'
import type { ImportKind } from '@/features/finance/types/finance'

export function ImportExportDialog({
  open,
  onOpenChange,
  initialKind,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialKind?: ImportKind
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import / export</DialogTitle>
          <DialogDescription>
            Download a template, fill it in, then upload to preview before anything is saved.
          </DialogDescription>
        </DialogHeader>
        {open ? <ImportExportPanel initialKind={initialKind} /> : null}
      </DialogContent>
    </Dialog>
  )
}
