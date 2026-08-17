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
