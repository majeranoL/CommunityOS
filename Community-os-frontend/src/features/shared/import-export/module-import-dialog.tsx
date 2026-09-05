import { useCallback, useMemo, useState } from 'react';
import { Download, FileUp, Loader2, RotateCcw, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useImportPreview,
  useConfirmImport,
  useDownloadTemplate,
  useDownloadErrors,
} from './hooks';
import { BatchHistoryPanel } from './batch-history-panel';
import type { ImportPreviewResult, ImportDetectResult } from './types';

interface ModuleImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: string;
  entityLabel: string;
}

type Step = 'upload' | 'mapping' | 'review';

const SKIP_VALUE = '__skip';

export function ModuleImportDialog({ open, onOpenChange, module, entityLabel }: ModuleImportDialogProps) {
  const [tab, setTab] = useState('import');
  const [format, setFormat] = useState('csv');
  const [step, setStep] = useState<Step>('upload');
  const [detect, setDetect] = useState<ImportDetectResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const previewMutation = useImportPreview(module);
  const downloadTemplate = useDownloadTemplate(module, format);
  const downloadErrors = useDownloadErrors();

  const handleReset = useCallback(() => {
    setStep('upload');
    setDetect(null);
    setMapping({});
    setPreview(null);
    setSelectedRows(new Set());
    setSelectedFile(null);
    previewMutation.reset();
  }, [previewMutation]);

  const confirmMutation = useConfirmImport(handleReset);

  const handleClose = useCallback(() => {
    handleReset();
    onOpenChange(false);
  }, [handleReset, onOpenChange]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = '';
      setSelectedFile(file);
      setPreview(null);
      setDetect(null);
      previewMutation.mutate(
        { file },
        {
          onSuccess: (result) => {
            if ('batchId' in result) return;
            setDetect(result);
            setMapping(result.autoMapping);
            setStep('mapping');
          },
        },
      );
    },
    [previewMutation],
  );

  const handleContinueToReview = useCallback(() => {
    if (!selectedFile) return;
    previewMutation.mutate(
      { file: selectedFile, columnMapping: mapping },
      {
        onSuccess: (result) => {
          if (!('batchId' in result)) return;
          setPreview(result);
          const validRows = result.rows.filter((r) => !((r.errors as string[])?.length));
          setSelectedRows(new Set(validRows.map((r) => r._row as number)));
          setStep('review');
        },
      },
    );
  }, [previewMutation, selectedFile, mapping]);

  const handleConfirm = useCallback(() => {
    if (!preview) return;
    confirmMutation.mutate({ batchId: preview.batchId, rowIndices: [...selectedRows] });
  }, [confirmMutation, preview, selectedRows]);

  const mappedCount = useMemo(
    () => Object.values(mapping).filter((v) => v).length,
    [mapping],
  );

  const validRowCount = useMemo(
    () => preview?.rows.filter((r) => !((r.errors as string[])?.length)).length ?? 0,
    [preview],
  );
  const invalidRowCount = useMemo(
    () => preview?.rows.filter((r) => (r.errors as string[])?.length).length ?? 0,
    [preview],
  );

  const allValidSelected = useMemo(() => {
    if (!preview) return false;
    const valid = preview.rows.filter((r) => !((r.errors as string[])?.length));
    return valid.length > 0 && valid.every((r) => selectedRows.has(r._row as number));
  }, [preview, selectedRows]);

  const handleToggleAllValid = useCallback(() => {
    if (!preview) return;
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (allValidSelected) {
        for (const r of preview.rows) {
          if (!(r.errors as string[])?.length) next.delete(r._row as number);
        }
      } else {
        for (const r of preview.rows) {
          if (!(r.errors as string[])?.length) next.add(r._row as number);
        }
      }
      return next;
    });
  }, [preview, allValidSelected]);

  const handleToggleRow = useCallback((row: Record<string, any>) => {
    if ((row.errors as string[])?.length) return;
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(row._row as number)) next.delete(row._row as number);
      else next.add(row._row as number);
      return next;
    });
  }, []);

const mappingFieldOptions = useCallback((currentValue: string) => {
    const headers = detect?.sourceHeaders ?? [];
    const values = new Set(headers);
    if (currentValue) values.add(currentValue);
    return Array.from(values).map((h) => (
      <SelectItem key={h} value={h}>
        {h}
      </SelectItem>
    ));
  }, [detect]);

  const tableColumns = preview?.columns ?? [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Import {entityLabel}s</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file, map its columns, review the rows, then import.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="import">Import</TabsTrigger>
            <TabsTrigger value="history">Recent imports</TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === 'history' ? (
          <BatchHistoryPanel module={module} />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label className="text-sm font-medium mb-1 block">Template Format</Label>
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
              <Button variant="outline" size="sm" className="mt-5" onClick={() => downloadTemplate.mutate()}>
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
            </div>

            {previewMutation.isPending && (
              <div className="flex items-center justify-center p-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
                <span className="text-sm text-muted-foreground">Parsing file...</span>
              </div>
            )}

            {step === 'upload' && !previewMutation.isPending && (
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  id="import-file"
                  className="hidden"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                />
                <label htmlFor="import-file" className="cursor-pointer">
                  <FileUp className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {selectedFile ? selectedFile.name : 'Click to select file or drag and drop'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports CSV, XLSX, XLS (max 10 MB)
                  </p>
                </label>
              </div>
            )}

            {step === 'mapping' && detect && !previewMutation.isPending && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{detect.totalRows} rows detected</Badge>
                    <Badge variant="default">
                      {mappedCount} of {detect.templateFields.length} columns mapped
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Auto-detected. Adjust the file column for each field, or skip it.
                  </span>
                </div>

                <Card>
                  <CardContent className="p-0">
                    <ScrollArea className="h-72">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-64">Import Field</TableHead>
                            <TableHead>File Column</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detect.templateFields.map((field) => {
                            const value = mapping[field.key] ?? '';
                            const isMapped = Boolean(value);
                            const sourceValue = isMapped
                              ? (detect.sample[0]?.[value as string] ?? '')
                              : '';
                            return (
                              <TableRow key={field.key}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {isMapped ? (
                                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    ) : (
                                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <span className="text-sm font-medium">{field.label}</span>
                                    {field.required && (
                                      <Badge variant="secondary" className="text-[10px]">
                                        required
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Select
                                      value={isMapped ? value : SKIP_VALUE}
                                      onValueChange={(v) =>
                                        setMapping((prev) => ({
                                          ...prev,
                                          [field.key]: v === SKIP_VALUE ? '' : v,
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="w-56">
                                        <SelectValue placeholder="Skip" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value={SKIP_VALUE}>Skip</SelectItem>
                                        {mappingFieldOptions(value)}
                                      </SelectContent>
                                    </Select>
                                    {isMapped && (
                                      <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                                        e.g. {sourceValue || '—'}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            )}

            {step === 'review' && preview && !previewMutation.isPending && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{preview.totalRows} total</Badge>
                  <Badge variant="default">{validRowCount} valid</Badge>
                  {invalidRowCount > 0 && (
                    <Badge variant="destructive">{invalidRowCount} skipped</Badge>
                  )}
                  <span className="text-sm text-muted-foreground ml-auto">
                    Importing {selectedRows.size} of {validRowCount} valid rows
                  </span>
                </div>

                <Card>
                  <CardContent className="p-0">
                    <ScrollArea className="h-64">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox
                                checked={allValidSelected}
                                onCheckedChange={handleToggleAllValid}
                                disabled={validRowCount === 0}
                                aria-label="Select all valid rows"
                              />
                            </TableHead>
                            <TableHead className="w-12">#</TableHead>
                            {tableColumns.map((col) => (
                              <TableHead key={col.key} className="whitespace-nowrap">
                                {col.label}
                                {col.required ? (
                                  <span className="text-destructive ml-0.5">*</span>
                                ) : null}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {preview.rows.map((row) => {
                            const isInvalid = Boolean((row.errors as string[])?.length);
                            return (
                              <TableRow key={row._row as number} className={isInvalid ? 'opacity-50' : ''}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedRows.has(row._row as number)}
                                    onCheckedChange={() => handleToggleRow(row)}
                                    disabled={isInvalid}
                                    aria-label={`Select row ${row._row}`}
                                  />
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">{row._row}</TableCell>
                                {tableColumns.map((col) => (
                                  <TableCell key={col.key} className="text-xs whitespace-nowrap max-w-[220px] truncate">
                                    {String(row[col.key] ?? '') || '—'}
                                  </TableCell>
                                ))}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {preview.invalid.length > 0 && (
                  <Card>
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between px-4 py-2 border-b">
                        <span className="text-sm font-medium">
                          Skipped rows ({preview.invalid.length + (invalidRowCount - preview.invalid.length > 0 ? `+${invalidRowCount - preview.invalid.length} more` : '')})
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadErrors.mutate(preview.batchId)}
                        >
                          <Download className="mr-2 h-3 w-3" />
                          Download Error File
                        </Button>
                      </div>
                      <ScrollArea className="h-40">
                        <div className="p-3 space-y-1">
                          {preview.invalid.map((row) => (
                            <p key={row._row as number} className="text-xs text-destructive">
                              Row {row._row}: {(row.errors as string[]).join('; ')}
                            </p>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {tab === 'import' && (
            <>
              {step === 'upload' && (
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
              )}
              {step === 'mapping' && (
                <>
                  <Button variant="outline" onClick={handleReset}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Start Over
                  </Button>
                  <Button
                    onClick={handleContinueToReview}
                    disabled={previewMutation.isPending || mappedCount === 0}
                  >
                    {previewMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ChevronRight className="mr-2 h-4 w-4" />
                    )}
                    Continue
                  </Button>
                </>
              )}
              {step === 'review' && (
                <>
                  <Button variant="outline" onClick={handleReset}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Choose Different File
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    disabled={selectedRows.size === 0 || confirmMutation.isPending}
                  >
                    {confirmMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Import {selectedRows.size > 0 ? `${selectedRows.size} Row${selectedRows.size === 1 ? '' : 's'}` : ''}
                  </Button>
                </>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}