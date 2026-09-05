export type ExportFormat = 'csv' | 'xlsx';

export interface TemplateField {
  key: string;
  label: string;
  required: boolean;
  type: 'string' | 'number' | 'date' | 'enum';
  enumValues?: string[];
  example?: string;
  description?: string;
}

export interface ImportContext {
  prisma: any;
  userId: string;
}

export interface ModuleImportConfig {
  module: string;
  entityLabel: string;
  templateFields: TemplateField[];
  validateRow: (row: Record<string, any>) => string[];
  applyRows: (
    communityId: string,
    batchId: string,
    rows: Record<string, any>[],
    ctx: ImportContext,
  ) => Promise<number>;
  duplicateKeys?: string[];
  checkDuplicates?: (
    communityId: string,
    rows: Record<string, any>[],
    prisma: any,
  ) => Promise<{ row: number; message: string }[]>;
}

export interface ModuleExportConfig {
  module: string;
  entityLabel: string;
  fetchRows: (
    communityId: string,
    filters: Record<string, any>,
    prisma: any,
  ) => Promise<Record<string, any>[]>;
  columns: { key: string; header: string }[];
}

export interface ModuleConfig {
  module: string;
  entityLabel?: string;
  importPermission: string;
  exportPermission: string;
  import?: ModuleImportConfig;
  export?: ModuleExportConfig;
}

export interface ModuleInfo {
  module: string;
  entityLabel: string;
  hasImport: boolean;
  hasExport: boolean;
}

export interface ModuleSchema {
  module: string;
  entityLabel: string;
  templateFields: TemplateField[];
  exportColumns: { key: string; header: string }[];
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

export interface ImportConfirmInput {
  rowIndices?: number[];
}
