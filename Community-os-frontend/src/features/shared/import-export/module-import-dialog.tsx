import { useState, useCallback } from 'react';
import { Download, FileUp, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  useImportPreview,
  useConfirmImport,
  useDownloadTemplate,
  useDownloadErrors,
} from './hooks';
import type { ImportPreviewResult } from './types';

interface ModuleImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: string;
  entityLabel: string;
}

export function ModuleImportDialog({ open, onOpenChange, module, entityLabel }: ModuleImportDialogProps) {
  const [format, setFormat] = useState('csv');
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const previewMutation = useImportPreview(module);
  const confirmMutation = useConfirmImport(() => handleReset());
  const downloadTemplate = useDownloadTemplate(module, format);
  const downloadErrors = useDownloadErrors();

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewResult(null);
    previewMutation.mutate({ file });
  }, []);

  const handleReset = useCallback(() => {
    setPreviewResult(null);
    setSelectedFile(null);
    previewMutation.reset();
  }, []);

  const handleClose = useCallback(() => {
    handleReset();
    onOpenChange(false);
  }, [handleReset, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Import {entityLabel}s</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file to import {entityLabel.toLowerCase()} records.
          </DialogDescription>
        </DialogHeader>

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
            <Button variant="outline" size="sm" onClick={() => downloadTemplate.mutate()}>
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </div>

          {!previewResult && (
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

          {previewMutation.isPending && (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
              <span className="text-sm text-muted-foreground">Parsing file...</span>
            </div>
          )}

          {previewResult && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge variant="outline">{previewResult.totalRows} total</Badge>
                <Badge variant="default">{previewResult.validRows} valid</Badge>
                {previewResult.invalidRows > 0 && (
                  <Badge variant="destructive">{previewResult.invalidRows} errors</Badge>
                )}
              </div>

              {previewResult.invalid.length > 0 && (
                <Card>
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between px-4 py-2 border-b">
                      <span className="text-sm font-medium">Errors</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadErrors.mutate(previewResult.batchId)}
                      >
                        <Download className="mr-2 h-3 w-3" />
                        Download Error File
                      </Button>
                    </div>
                    <ScrollArea className="h-48">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">Row</TableHead>
                            <TableHead>Errors</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewResult.invalid.map((row) => (
                            <TableRow key={row._row}>
                              <TableCell className="text-xs">{row._row}</TableCell>
                              <TableCell className="text-xs text-destructive">
                                {(row.errors as string[]).join('; ')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {previewResult ? (
            <>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Choose Different File
              </Button>
              <Button
                onClick={() => confirmMutation.mutate(previewResult.batchId)}
                disabled={confirmMutation.isPending}
              >
                {confirmMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Confirm Import
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
