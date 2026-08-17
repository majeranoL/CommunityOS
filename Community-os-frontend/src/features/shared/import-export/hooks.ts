import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiErrorMessage } from '@/lib/api';
import { importExportService } from './service';
import type { ImportConfirmResult } from './types';

export const importExportKeys = {
  all: ['import-export'] as const,
  modules: () => [...importExportKeys.all, 'modules'] as const,
  batches: (module?: string) => [...importExportKeys.all, 'batches', module] as const,
};

export function useImportExportModules() {
  return useQuery({
    queryKey: importExportKeys.modules(),
    queryFn: () => importExportService.getModules(),
  });
}

export function useImportPreview(module: string) {
  return useMutation({
    mutationFn: ({ file, columnMapping }: { file: File; columnMapping?: Record<string, string> }) =>
      importExportService.preview(module, file, columnMapping),
    onError: (error: any) =>
      toast.error(apiErrorMessage(error, 'Failed to parse import file.')),
  });
}

export function useConfirmImport(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) => importExportService.confirm(batchId),
    onSuccess: (result: ImportConfirmResult) => {
      toast.success(`Import complete. ${result.created} of ${result.total} records created.`);
      queryClient.invalidateQueries({ queryKey: importExportKeys.all });
      onSuccess?.();
    },
    onError: (error: any) =>
      toast.error(apiErrorMessage(error, 'Failed to confirm import.')),
  });
}

export function useCancelImport(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) => importExportService.cancel(batchId),
    onSuccess: () => {
      toast.success('Import cancelled.');
      queryClient.invalidateQueries({ queryKey: importExportKeys.all });
      onSuccess?.();
    },
    onError: (error: any) =>
      toast.error(apiErrorMessage(error, 'Failed to cancel import.')),
  });
}

export function useRollbackImport(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) => importExportService.rollback(batchId),
    onSuccess: () => {
      toast.success('Import rolled back.');
      queryClient.invalidateQueries({ queryKey: importExportKeys.all });
      onSuccess?.();
    },
    onError: (error: any) =>
      toast.error(apiErrorMessage(error, 'Failed to rollback import.')),
  });
}

export function useExportModule() {
  return useMutation({
    mutationFn: ({ module: mod, format, columns }: { module: string; format: string; columns?: string[] }) =>
      importExportService.exportData(mod, format, columns),
    onSuccess: (blob: Blob, vars) => {
      const ext = vars.format === 'xlsx' ? 'xlsx' : 'csv';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${vars.module}-export.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded.');
    },
    onError: (error: any) =>
      toast.error(apiErrorMessage(error, 'Failed to export data.')),
  });
}

export function useDownloadTemplate(module: string, format: string) {
  return useMutation({
    mutationFn: () => importExportService.downloadTemplate(module, format),
    onSuccess: (blob: Blob) => {
      const ext = format === 'xlsx' ? 'xlsx' : 'csv';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${module}-template.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Template downloaded.');
    },
    onError: (error: any) =>
      toast.error(apiErrorMessage(error, 'Failed to download template.')),
  });
}

export function useDownloadErrors() {
  return useMutation({
    mutationFn: (batchId: string) => importExportService.downloadErrors(batchId),
    onSuccess: (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'import-errors.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    onError: (error: any) =>
      toast.error(apiErrorMessage(error, 'Failed to download error file.')),
  });
}

export function useImportBatches(module?: string) {
  return useQuery({
    queryKey: importExportKeys.batches(module),
    queryFn: () => importExportService.batches(module),
  });
}
