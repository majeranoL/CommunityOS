export type ExportFormat = 'csv' | 'xlsx';

export type ImportBatchStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';

export interface ModuleInfo {
  module: string;
  entityLabel: string;
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

export interface ModuleSchema {
  module: string;
  entityLabel: string;
  templateFields: TemplateField[];
  exportColumns: ExportColumn[];
}

export interface ImportDetectResult {
  sourceHeaders: string[];
  autoMapping: Record<string, string>;
  sample: Record<string, any>[];
  totalRows: number;
  templateFields: TemplateField[];
}

export interface ImportPreviewResult {
  batchId: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  sourceHeaders: string[];
  autoMapping: Record<string, string>;
  columns: { key: string; label: string; required: boolean }[];
  rows: Record<string, any>[];
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
  fileName: string;
  status: ImportBatchStatus;
  canRollback: boolean;
  resultCounts: {
    total: number;
    valid: number;
    invalid?: number;
    imported?: number;
    selected?: number;
  };
  importedBy: { id: string; firstName: string; lastName: string } | null;
  processedAt?: string | null;
  rolledBackAt?: string | null;
  createdAt: string;
}

export interface ExportColumn {
  key: string;
  header: string;
}