import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ImportBatchStatus } from '@prisma/client';
import * as ExcelJS from 'exceljs';

import { PrismaService } from '../../prisma/prisma.service';
import { ModuleRegistry } from './module-registry';
import type { ExportFormat, ImportPreviewResult } from './import-export.types';

@Injectable()
export class ImportExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ModuleRegistry,
  ) {}

  // ==========================================
  // TEMPLATE DOWNLOAD
  // ==========================================

  async template(module: string, format: ExportFormat) {
    const config = this.registry.getImportConfig(module);
    if (!config) {
      throw new BadRequestException(
        `Module "${module}" does not support import.`,
      );
    }

    const headers = config.templateFields.map((f) => f.label);
    const exampleRow: Record<string, string> = {};
    for (const field of config.templateFields) {
      exampleRow[field.label] = field.example ?? '';
    }

    if (format === 'xlsx') {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Template');

      ws.addRow(headers);
      ws.addRow(headers.map(() => ''));
      ws.getRow(2).values = config.templateFields.map((f) => f.example ?? '');

      ws.getRow(1).font = { bold: true };
      ws.getRow(1).eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD9E1F2' },
        };
        cell.border = {
          bottom: { style: 'thin' },
        };
      });

      const instructions = wb.addWorksheet('Instructions');
      instructions.addRow([
        'Field',
        'Required',
        'Type',
        'Description',
        'Accepted Values',
      ]);
      for (const field of config.templateFields) {
        instructions.addRow([
          field.label,
          field.required ? 'Yes' : 'No',
          field.type,
          field.description ?? '',
          field.enumValues?.join(', ') ?? '',
        ]);
      }
      instructions.getRow(1).font = { bold: true };

      const buffer = await wb.xlsx.writeBuffer();
      return {
        buffer: Buffer.from(buffer),
        filename: `${module}-import-template.xlsx`,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }

    const csvRows = [
      headers,
      config.templateFields.map((f) => f.example ?? ''),
    ];
    const csvContent = csvRows
      .map((row) =>
        row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','),
      )
      .join('\n');
    const buffer = Buffer.from('\uFEFF' + csvContent, 'utf-8');
    return {
      buffer,
      filename: `${module}-import-template.csv`,
      contentType: 'text/csv; charset=utf-8',
    };
  }

  // ==========================================
  // FILE PARSING
  // ==========================================

  async parseFile(
    buffer: Buffer,
    filename: string,
  ): Promise<Record<string, any>[]> {
    const ext = filename.toLowerCase().split('.').pop();
    if (ext === 'csv') {
      return this.parseCsv(buffer);
    }
    if (ext === 'xlsx' || ext === 'xls') {
      return this.parseXlsx(buffer);
    }
    throw new BadRequestException('Unsupported file format. Use CSV or XLSX.');
  }

  private parseCsv(buffer: Buffer): Record<string, any>[] {
    const text = buffer.toString('utf-8').replace(/^\uFEFF/, '');
    const lines: string[][] = [];
    let current: string[] = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (inQuotes) {
        if (char === '"' && text[i + 1] === '"') {
          field += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          field += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          current.push(field);
          field = '';
        } else if (char === '\n' || char === '\r') {
          if (char === '\r' && text[i + 1] === '\n') i++;
          current.push(field);
          if (current.some((f) => f.trim())) lines.push(current);
          current = [];
          field = '';
        } else {
          field += char;
        }
      }
    }
    current.push(field);
    if (current.some((f) => f.trim())) lines.push(current);

    if (lines.length < 2) return [];

    const headers = lines[0].map((h) => this.normalizeHeader(h));
    return lines
      .slice(1)
      .map((row) => {
        const obj: Record<string, any> = { _row: 0 };
        headers.forEach((h, i) => {
          obj[h] = row[i]?.trim() ?? '';
        });
        return obj;
      })
      .map((obj, idx) => ({ ...obj, _row: idx + 2 }));
  }

  private async parseXlsx(buffer: Buffer): Promise<Record<string, any>[]> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as any);
    const ws = wb.worksheets[0];
    if (!ws || ws.rowCount < 2) return [];

    const headerRow = ws.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = this.normalizeHeader(String(cell.text ?? ''));
    });

    const rows: Record<string, any>[] = [];
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const obj: Record<string, any> = { _row: rowNumber };
      headers.forEach((h, i) => {
        const cell = row.getCell(i + 1);
        obj[h] = cell.text?.trim() ?? '';
      });
      if (Object.values(obj).some((v) => v !== '' && v !== rowNumber)) {
        rows.push(obj);
      }
    });

    return rows;
  }

  private normalizeHeader(header: string): string {
    return header
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  // ==========================================
  // COLUMN MAPPING
  // ==========================================

  mapColumns(
    rows: Record<string, any>[],
    mapping: Record<string, string>,
  ): Record<string, any>[] {
    return rows.map((row) => {
      const mapped: Record<string, any> = { _row: row._row };
      for (const [targetKey, sourceKey] of Object.entries(mapping)) {
        mapped[targetKey] = row[sourceKey] ?? '';
      }
      return mapped;
    });
  }

  autoMapColumns(
    sourceHeaders: string[],
    templateKeys: string[],
  ): Record<string, string> {
    const mapping: Record<string, string> = {};
    for (const key of templateKeys) {
      const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      const match = sourceHeaders.find(
        (h) =>
          h === normalized || h.includes(normalized) || normalized.includes(h),
      );
      if (match) {
        mapping[key] = match;
      }
    }
    return mapping;
  }

  // ==========================================
  // PREVIEW (parse + validate + detect duplicates)
  // ==========================================

  async preview(
    communityId: string,
    module: string,
    buffer: Buffer,
    filename: string,
    columnMapping?: Record<string, string>,
  ): Promise<ImportPreviewResult> {
    const config = this.registry.getImportConfig(module);
    if (!config) {
      throw new BadRequestException(
        `Module "${module}" does not support import.`,
      );
    }

    const rawRows = await this.parseFile(buffer, filename);
    if (rawRows.length === 0) {
      throw new BadRequestException('The uploaded file contains no data rows.');
    }

    let rows = rawRows;
    if (columnMapping) {
      rows = this.mapColumns(rawRows, columnMapping);
    }

    const valid: Record<string, any>[] = [];
    const invalid: Record<string, any>[] = [];

    for (const row of rows) {
      const errors = config.validateRow(row);
      if (errors.length) {
        invalid.push({ ...row, errors });
      }
      valid.push({ ...row, errors });
    }

    let duplicates: { row: number; message: string }[] = [];
    if (config.checkDuplicates && config.duplicateKeys?.length) {
      duplicates = await config.checkDuplicates(
        communityId,
        valid,
        this.prisma,
      );
      for (const dup of duplicates) {
        const row = valid.find((r) => r._row === dup.row);
        if (row) {
          row.errors = [...(row.errors || []), `Duplicate: ${dup.message}`];
          if (!invalid.includes(row)) invalid.push(row);
        }
      }
    }

    const batch = await this.prisma.importBatch.create({
      data: {
        communityId,
        module,
        fileName: filename,
        importedById: '', // set by controller
        status: ImportBatchStatus.PROCESSING,
        canRollback: true,
        data: rows as any,
        resultCounts: {
          total: rows.length,
          valid: valid.length,
          invalid: invalid.length,
        },
      },
    });

    return {
      batchId: batch.id,
      totalRows: rows.length,
      validRows: valid.length - duplicates.length,
      invalidRows: invalid.length,
      preview: valid.filter((r) => !r.errors?.length).slice(0, 20),
      invalid: invalid.slice(0, 50),
      duplicates,
    };
  }

  // ==========================================
  // CONFIRM
  // ==========================================

  async confirm(communityId: string, batchId: string, userId: string) {
    const batch = await this.prisma.importBatch.findFirst({
      where: { id: batchId, communityId },
    });

    if (!batch) throw new NotFoundException('Import batch not found.');
    if (batch.status !== ImportBatchStatus.PROCESSING) {
      throw new BadRequestException(
        'Import batch is not awaiting confirmation.',
      );
    }

    const config = this.registry.getImportConfig(batch.module);
    if (!config)
      throw new BadRequestException('Module configuration not found.');

    const rows = (batch.data as any[]) ?? [];
    const validRows = rows.filter((row: any) => !row.errors?.length);

    const created = await config.applyRows(communityId, batch.id, validRows, {
      prisma: this.prisma,
      userId,
    });

    await this.prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: ImportBatchStatus.COMPLETED,
        processedAt: new Date(),
        resultCounts: {
          total: rows.length,
          valid: validRows.length,
          imported: created,
        },
      },
    });

    return {
      success: true,
      message: `Imported ${created} of ${validRows.length} valid row${validRows.length === 1 ? '' : 's'}.`,
      data: { created, total: validRows.length, batchId: batch.id },
    };
  }

  // ==========================================
  // CANCEL / ROLLBACK
  // ==========================================

  async cancel(communityId: string, batchId: string) {
    const batch = await this.prisma.importBatch.findFirst({
      where: { id: batchId, communityId },
    });

    if (!batch) throw new NotFoundException('Import batch not found.');
    if (batch.status !== ImportBatchStatus.PROCESSING) {
      throw new BadRequestException(
        'Only pending import batches can be cancelled.',
      );
    }

    await this.prisma.importBatch.update({
      where: { id: batchId },
      data: { status: ImportBatchStatus.ROLLED_BACK, rolledBackAt: new Date() },
    });

    return { success: true, message: 'Import batch cancelled.' };
  }

  async rollback(communityId: string, batchId: string) {
    const batch = await this.prisma.importBatch.findFirst({
      where: { id: batchId, communityId },
    });

    if (!batch) throw new NotFoundException('Import batch not found.');
    if (batch.status !== ImportBatchStatus.COMPLETED) {
      throw new BadRequestException(
        'Only completed import batches can be rolled back.',
      );
    }

    const moduleModelMap: Record<string, string> = {
      households: 'household',
      residents: 'resident',
      vehicles: 'vehicle',
      pets: 'pet',
      staff: 'staff',
    };

    const modelName = moduleModelMap[batch.module];
    if (modelName) {
      const model = (this.prisma as any)[modelName];
      if (model) {
        await model.updateMany({
          where: { importBatchId: batchId, deletedAt: null },
          data: { deletedAt: new Date() },
        });
      }
    }

    await this.prisma.importBatch.update({
      where: { id: batchId },
      data: { status: ImportBatchStatus.ROLLED_BACK, rolledBackAt: new Date() },
    });

    return {
      success: true,
      message: 'Import batch rolled back. Records soft-deleted.',
    };
  }

  // ==========================================
  // EXPORT
  // ==========================================

  async exportData(
    communityId: string,
    module: string,
    format: ExportFormat,
    filters: Record<string, any> = {},
    columns?: string[],
  ) {
    const config = this.registry.getExportConfig(module);
    if (!config) {
      throw new BadRequestException(
        `Module "${module}" does not support export.`,
      );
    }

    const allRows = await config.fetchRows(communityId, filters, this.prisma);
    const selectedColumns = columns?.length
      ? config.columns.filter((c) => columns.includes(c.key))
      : config.columns;

    const rows = allRows.map((row) => {
      const out: Record<string, any> = {};
      for (const col of selectedColumns) {
        out[col.header] = row[col.key] ?? '';
      }
      return out;
    });

    return this.buildFile(rows, format, module);
  }

  // ==========================================
  // ERROR DOWNLOAD
  // ==========================================

  async downloadErrors(communityId: string, batchId: string) {
    const batch = await this.prisma.importBatch.findFirst({
      where: { id: batchId, communityId },
    });

    if (!batch) throw new NotFoundException('Import batch not found.');

    const rows = (batch.data as any[]) ?? [];
    const errorRows = rows.filter((r: any) => r.errors?.length);
    if (!errorRows.length) {
      throw new BadRequestException('No error rows in this batch.');
    }

    const columns = Object.keys(errorRows[0]).filter(
      (k) => !k.startsWith('_') && k !== 'errors',
    );

    const exportRows = errorRows.map((row) => {
      const out: Record<string, any> = {};
      for (const col of columns) {
        out[col] = row[col] ?? '';
      }
      out['Errors'] = (row.errors as string[]).join('; ');
      return out;
    });

    return this.buildFile(exportRows, 'csv', `${batch.module}-errors`);
  }

  // ==========================================
  // BATCHES
  // ==========================================

  async batches(communityId: string, module?: string, page = 1, limit = 20) {
    const where: any = { communityId };
    if (module) where.module = module;

    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.importBatch.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          module: true,
          fileName: true,
          status: true,
          canRollback: true,
          resultCounts: true,
          processedAt: true,
          rolledBackAt: true,
          createdAt: true,
        },
      }),
      this.prisma.importBatch.count({ where }),
    ]);

    return {
      success: true,
      message: 'Import batches retrieved.',
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==========================================
  // FILE BUILDER
  // ==========================================

  private async buildFile(
    rows: Record<string, any>[],
    format: ExportFormat,
    label: string,
  ) {
    if (format === 'xlsx') {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(label);
      if (rows.length > 0) {
        ws.addRow(Object.keys(rows[0]));
        for (const row of rows) {
          ws.addRow(Object.values(row));
        }
        ws.getRow(1).font = { bold: true };
      }
      const buffer = await wb.xlsx.writeBuffer();
      return {
        buffer: Buffer.from(buffer),
        filename: `${label}-export.xlsx`,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }

    if (rows.length === 0) {
      return {
        buffer: Buffer.from(''),
        filename: `${label}-export.csv`,
        contentType: 'text/csv',
      };
    }

    const headers = Object.keys(rows[0]);
    const csvRows = [
      headers,
      ...rows.map((r) => headers.map((h) => String(r[h] ?? ''))),
    ];
    const csv = csvRows
      .map((row) =>
        row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','),
      )
      .join('\n');
    return {
      buffer: Buffer.from('\uFEFF' + csv, 'utf-8'),
      filename: `${label}-export.csv`,
      contentType: 'text/csv; charset=utf-8',
    };
  }
}
