import { useMemo, useState } from 'react';
import { Download, Loader2, ListChecks } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useExportModule, useImportSchema } from './hooks';

interface ModuleExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: string;
  entityLabel: string;
  filters?: Record<string, string>;
}

export function ModuleExportDialog({ open, onOpenChange, module, entityLabel, filters = {} }: ModuleExportDialogProps) {
  const [format, setFormat] = useState('csv');
  const [scope, setScope] = useState<'all' | 'current'>('all');

  const exportMutation = useExportModule();
  const { data: schema } = useImportSchema(module);

  const columns = schema?.exportColumns ?? [];
  const columnKeys = useMemo(() => columns.map((c) => c.key), [columns]);

  const [prevKeys, setPrevKeys] = useState<string[]>(columnKeys);
  const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set());
  if (prevKeys !== columnKeys) {
    setPrevKeys(columnKeys);
    setSelectedCols(new Set(columnKeys));
  }

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter((v) => Boolean(v)).length,
    [filters],
  );

  const allSelected = columns.length > 0 && columns.every((c) => selectedCols.has(c.key));

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedCols(new Set());
    } else {
      setSelectedCols(new Set(columns.map((c) => c.key)));
    }
  };

  const handleToggleCol = (key: string) => {
    setSelectedCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleExport = () => {
    exportMutation.mutate(
      {
        module,
        format,
        columns: Array.from(selectedCols),
        filters: scope === 'current' ? filters : undefined,
      },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export {entityLabel}s</DialogTitle>
          <DialogDescription>
            Choose the format, columns, and record scope to download.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-1 block">Export Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (.csv)</SelectItem>
                <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-1 block">Columns</Label>
            <Card>
              <CardContent className="p-0">
                <div className="flex items-center justify-between px-4 py-2 border-b">
                  <span className="text-sm text-muted-foreground">
                    {selectedCols.size} of {columns.length} selected
                  </span>
                  <Button variant="ghost" size="sm" onClick={handleToggleAll} disabled={columns.length === 0}>
                    <ListChecks className="mr-1.5 h-3 w-3" />
                    {allSelected ? 'Select none' : 'Select all'}
                  </Button>
                </div>
                <ScrollArea className="h-48">
                  <div className="p-2 space-y-0.5">
                    {columns.map((col) => (
                      <label
                        key={col.key}
                        className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted/60 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedCols.has(col.key)}
                          onCheckedChange={() => handleToggleCol(col.key)}
                          aria-label={col.header}
                        />
                        <span className="text-sm">{col.header}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <div>
            <Label className="text-sm font-medium mb-1 block">Scope</Label>
            <Select
              value={scope}
              onValueChange={(v) => setScope(v as 'all' | 'current')}
              disabled={activeFilterCount === 0}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {entityLabel.toLowerCase()} records</SelectItem>
                <SelectItem value="current">
                  Current page filters ({activeFilterCount} active)
                </SelectItem>
              </SelectContent>
            </Select>
            {activeFilterCount === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                No active filters on this page, so all records will be exported.
              </p>
            )}
          </div>

          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(filters)
                .filter(([, v]) => Boolean(v))
                .map(([key, value]) => (
                  <Badge key={key} variant="outline">
                    {key}: {value}
                  </Badge>
                ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={exportMutation.isPending || selectedCols.size === 0}
          >
            {exportMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}