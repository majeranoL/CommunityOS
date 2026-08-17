import api from '@/lib/api';
import type { ApiEnvelope } from '@/types/api';
import type { ImportBatch, ImportPreviewResult, ImportConfirmResult, ModuleInfo } from './types';

export const importExportService = {
  async getModules(): Promise<ModuleInfo[]> {
    const { data } = await api.get<ApiEnvelope<ModuleInfo[]>>('/import-export/modules');
    return data.data;
  },

  async downloadTemplate(module: string, format: string): Promise<Blob> {
    const response = await api.get(`/import-export/template/${module}`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  },

  async preview(module: string, file: File, columnMapping?: Record<string, string>): Promise<ImportPreviewResult> {
    const formData = new FormData();
    formData.append('file', file);
    if (columnMapping) {
      formData.append('columnMapping', JSON.stringify(columnMapping));
    }
    const { data } = await api.post<ApiEnvelope<ImportPreviewResult>>(
      `/import-export/import/${module}/preview`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data.data;
  },

  async confirm(batchId: string): Promise<ImportConfirmResult> {
    const { data } = await api.post<ApiEnvelope<ImportConfirmResult>>(
      `/import-export/import/${batchId}/confirm`,
    );
    return data.data;
  },

  async cancel(batchId: string): Promise<{ success: boolean }> {
    const { data } = await api.post<ApiEnvelope<{ success: boolean }>>(
      `/import-export/import/${batchId}/cancel`,
    );
    return data.data;
  },

  async rollback(batchId: string): Promise<{ success: boolean }> {
    const { data } = await api.post<ApiEnvelope<{ success: boolean }>>(
      `/import-export/import/${batchId}/rollback`,
    );
    return data.data;
  },

  async exportData(module: string, format: string, columns?: string[]): Promise<Blob> {
    const response = await api.get(`/import-export/export/${module}`, {
      params: { format, columns: columns?.join(',') },
      responseType: 'blob',
    });
    return response.data;
  },

  async downloadErrors(batchId: string): Promise<Blob> {
    const response = await api.get(`/import-export/errors/${batchId}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async batches(module?: string, page = 1, limit = 20): Promise<{ items: ImportBatch[]; pagination: any }> {
    const params: Record<string, any> = { page, limit };
    if (module) params.module = module;
    const { data } = await api.get<ApiEnvelope<ImportBatch[]>>('/import-export/batches', { params });
    return { items: data.data, pagination: data.pagination };
  },
};
