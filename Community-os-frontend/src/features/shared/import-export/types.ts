export type ExportFormat = 'csv' | 'xlsx';

export interface ModuleInfo {
  module: string;
  hasImport: boolean;
  hasExport: boolean;
}

export interface TemplateField {
  key: string;
  label: string;
  required: boolean;
  type: 'string' | 'number' | 'date' | 'enum';
  enumValues?: string[];
  example?: string;
  description?: string;
}

export interface ImportPreviewResult {
  batchId: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  preview: Record<string, any>[];
  invalid: Record<string, any>[];
  duplicates: { row: number; message: string }[];
}

export interface ImportConfirmResult {
  created: number;
  total: number;
  batchId: string;
}

export interface ImportBatch {
  id: string;
  module: string;
  filename: string;
  status: string;
  totalRows: number;
  processedRows: number;
  errorRows: number;
  importedBy: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
}

export interface ExportColumn {
  key: string;
  header: string;
}
