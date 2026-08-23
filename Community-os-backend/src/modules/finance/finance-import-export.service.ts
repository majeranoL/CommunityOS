import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AssessmentStatus,
  BillingPeriodStatus,
  ExpenseCategory,
  FinanceCategory,
  ImportBatchStatus,
  PaymentMethod,
  PaymentStatus,
  UtilityType,
} from '@prisma/client';

import * as ExcelJS from 'exceljs';

import { PrismaService } from '../../prisma/prisma.service';

import { FinanceSyncService } from './finance-sync.service';

export type ImportKind =
  'payments' | 'assessments' | 'expenses' | 'utility-readings';
export type ExportFormat = 'csv' | 'xlsx';

@Injectable()
export class FinanceImportExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financeSyncService: FinanceSyncService,
  ) {}

  // ==========================================
  // EXPORT
  // ==========================================

  async export(
    communityId: string,
    kind: ImportKind,
    format: ExportFormat,
    filters: { category?: string; from?: string; to?: string } = {},
    scopeHouseholdId?: string,
  ) {
    if (kind === 'utility-readings') {
      const readings = await this.prisma.utilityReading.findMany({
        where: {
          communityId,
          ...(scopeHouseholdId ? { householdId: scopeHouseholdId } : {}),
          ...(filters.from || filters.to
            ? {
                readingDate: {
                  ...(filters.from ? { gte: new Date(filters.from) } : {}),
                  ...(filters.to ? { lte: new Date(filters.to) } : {}),
                },
              }
            : {}),
        },
        include: {
          household: { select: { block: true, lot: true, unit: true } },
          utilityConfig: { select: { utilityType: true, name: true } },
        },
        orderBy: [{ periodKey: 'desc' }, { createdAt: 'desc' }],
      });

      const rows = readings.map((reading) => ({
        UtilityType: reading.utilityConfig.utilityType,
        Block: reading.household.block ?? '',
        Lot: reading.household.lot ?? '',
        Unit: reading.household.unit ?? '',
        Period: reading.periodKey,
        PreviousReading:
          reading.previousReading != null
            ? Number(reading.previousReading)
            : '',
        CurrentReading:
          reading.currentReading != null ? Number(reading.currentReading) : '',
        ReadingDate: reading.readingDate.toISOString().slice(0, 10),
        Notes: reading.notes ?? '',
      }));

      return this.buildFile(rows, format, 'utility-readings');
    }

    if (kind === 'expenses') {
      const expenses = await this.prisma.expense.findMany({
        where: {
          communityId,
          deletedAt: null,
          ...(filters.category
            ? { category: filters.category as ExpenseCategory }
            : {}),
          ...(filters.from || filters.to
            ? {
                expenseDate: {
                  ...(filters.from ? { gte: new Date(filters.from) } : {}),
                  ...(filters.to ? { lte: new Date(filters.to) } : {}),
                },
              }
            : {}),
        },
        orderBy: { expenseDate: 'desc' },
      });

      const rows = expenses.map((expense) => ({
        ExpenseNumber: expense.expenseNumber,
        Title: expense.title,
        Category: expense.category,
        Amount: Number(expense.amount),
        ExpenseDate: expense.expenseDate.toISOString().slice(0, 10),
        PaymentMethod: expense.paymentMethod,
        Payee: expense.payee ?? '',
        Reference: expense.referenceNumber ?? '',
        Notes: expense.notes ?? '',
      }));

      return this.buildFile(rows, format, 'expenses');
    }

    if (kind === 'payments') {
      const payments = await this.prisma.payment.findMany({
        where: {
          communityId,
          deletedAt: null,
          ...(scopeHouseholdId
            ? { resident: { householdId: scopeHouseholdId } }
            : {}),
          ...(filters.category
            ? {
                OR: [
                  {
                    chargeType: {
                      category: filters.category as FinanceCategory,
                    },
                  },
                  {
                    allocations: {
                      some: {
                        assessment: {
                          chargeType: {
                            category: filters.category as FinanceCategory,
                          },
                        },
                      },
                    },
                  },
                ],
              }
            : {}),
          ...(filters.from || filters.to
            ? {
                paymentDate: {
                  ...(filters.from ? { gte: new Date(filters.from) } : {}),
                  ...(filters.to ? { lte: new Date(filters.to) } : {}),
                },
              }
            : {}),
        },
        include: {
          resident: {
            select: {
              firstName: true,
              lastName: true,
              household: { select: { block: true, lot: true, unit: true } },
            },
          },
          chargeType: { select: { code: true, name: true, category: true } },
          allocations: {
            include: {
              assessment: {
                select: {
                  assessmentNumber: true,
                  chargeType: {
                    select: { code: true, name: true, category: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const rows = payments.map((payment) => {
        const household = payment.resident.household ?? {
          block: '',
          lot: '',
          unit: '',
        };

        return {
          PaymentNumber: payment.paymentNumber,
          Resident: `${payment.resident.firstName} ${payment.resident.lastName}`,
          Block: household.block,
          Lot: household.lot,
          Unit: household.unit,
          Amount: Number(payment.amount),
          PaymentDate: payment.paymentDate.toISOString().slice(0, 10),
          Method: payment.method,
          Reference: payment.referenceNumber ?? '',
          ChargeType: payment.chargeType?.name ?? '',
          Category: payment.chargeType?.category ?? '',
          Status: payment.status,
          Remarks: payment.remarks ?? '',
        };
      });

      return this.buildFile(rows, format, 'payments');
    }

    const assessments = await this.prisma.assessment.findMany({
      where: {
        communityId,
        deletedAt: null,
        ...(scopeHouseholdId ? { householdId: scopeHouseholdId } : {}),
        ...(filters.category
          ? { chargeType: { category: filters.category as FinanceCategory } }
          : {}),
        ...(filters.from || filters.to
          ? {
              dueDate: {
                ...(filters.from ? { gte: new Date(filters.from) } : {}),
                ...(filters.to ? { lte: new Date(filters.to) } : {}),
              },
            }
          : {}),
      },
      include: {
        household: { select: { block: true, lot: true, unit: true } },
        chargeType: { select: { code: true, name: true, category: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = assessments.map((assessment) => ({
      AssessmentNumber: assessment.assessmentNumber,
      Title: assessment.title,
      Block: assessment.household.block,
      Lot: assessment.household.lot,
      Unit: assessment.household.unit,
      Amount: Number(assessment.amount),
      PaidAmount: Number(assessment.paidAmount),
      Balance: Number(assessment.amount) - Number(assessment.paidAmount),
      DueDate: assessment.dueDate.toISOString().slice(0, 10),
      Period: assessment.period ?? '',
      ChargeType: assessment.chargeType?.name ?? '',
      Category: assessment.chargeType?.category ?? '',
      Status: assessment.status,
    }));

    return this.buildFile(rows, format, 'assessments');
  }

  private async buildFile(
    rows: Record<string, any>[],
    format: ExportFormat,
    name: string,
  ): Promise<{ filename: string; buffer: Buffer; contentType: string }> {
    if (format === 'csv') {
      const headers = rows.length ? Object.keys(rows[0]) : ['No data'];
      const escape = (value: any) => {
        const text = value === null || value === undefined ? '' : String(value);
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
      };

      const lines = [
        headers.join(','),
        ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
      ];

      return {
        filename: `${name}-${new Date().toISOString().slice(0, 10)}.csv`,
        buffer: Buffer.from(`\uFEFF${lines.join('\n')}`, 'utf8'),
        contentType: 'text/csv; charset=utf-8',
      };
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(name);

    if (rows.length) {
      sheet.addRow(Object.keys(rows[0])).font = { bold: true };
      for (const row of rows) {
        sheet.addRow(Object.keys(row).map((key) => row[key]));
      }
      sheet.columns.forEach((column) => {
        column.width = 24;
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return {
      filename: `${name}-${new Date().toISOString().slice(0, 10)}.xlsx`,
      buffer: Buffer.from(buffer),
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  // ==========================================
  // IMPORT
  // ==========================================

  async preview(
    communityId: string,
    kind: ImportKind,
    file: Express.Multer.File,
    userId: string,
  ) {
    const rows = await this.parseFile(file);

    const { valid, invalid } = this.validateRows(communityId, kind, rows);

    const batch = await this.prisma.importBatch.create({
      data: {
        communityId,
        module:
          kind === 'payments'
            ? 'finance-payments'
            : kind === 'assessments'
              ? 'finance-assessments'
              : kind === 'utility-readings'
                ? 'finance-utility-readings'
                : 'finance-expenses',
        fileName: file.originalname,
        importedById: userId,
        status: ImportBatchStatus.PROCESSING,
        canRollback: true,
        resultCounts: {
          total: rows.length,
          valid: valid.length,
          invalid: invalid.length,
        },
        errors: invalid,
        data: rows as any,
      },
    });

    return {
      success: true,
      message:
        invalid.length === 0
          ? 'File parsed successfully. Ready to import.'
          : `File parsed with ${invalid.length} row${invalid.length === 1 ? '' : 's'} to review.`,
      data: {
        batchId: batch.id,
        totalRows: rows.length,
        validRows: valid.length,
        invalidRows: invalid.length,
        preview: valid.slice(0, 20),
        invalid,
      },
    };
  }

  async confirm(communityId: string, batchId: string) {
    const batch = await this.prisma.importBatch.findFirst({
      where: { id: batchId, communityId },
    });

    if (!batch) {
      throw new NotFoundException('Import batch not found.');
    }

    if (batch.status !== ImportBatchStatus.PROCESSING) {
      throw new BadRequestException(
        'Import batch is not awaiting confirmation.',
      );
    }

    const rows = (batch.data as any) ?? [];
    const valid = rows.filter((row: any) => !row.errors?.length);
    let created = 0;

    const kind: ImportKind =
      batch.module === 'finance-assessments'
        ? 'assessments'
        : batch.module === 'finance-expenses'
          ? 'expenses'
          : batch.module === 'finance-utility-readings'
            ? 'utility-readings'
            : 'payments';

    if (kind === 'payments') {
      created = await this.applyPayments(communityId, batch.id, valid);
    } else if (kind === 'expenses') {
      created = await this.applyExpenses(
        communityId,
        batch.id,
        valid,
        batch.importedById,
      );
    } else if (kind === 'utility-readings') {
      created = await this.applyUtilityReadings(
        communityId,
        batch.id,
        valid,
        batch.importedById,
      );
    } else {
      created = await this.applyAssessments(communityId, batch.id, valid);
    }

    await this.prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: ImportBatchStatus.COMPLETED,
        processedAt: new Date(),
        resultCounts: {
          total: rows.length,
          valid: valid.length,
          invalid: valid.length - created,
          imported: created,
        },
      },
    });

    return {
      success: true,
      message: `Imported ${created} of ${valid.length} valid row${valid.length === 1 ? '' : 's'}.`,
      data: { created, total: valid.length, batchId: batch.id },
    };
  }

  async rollback(communityId: string, batchId: string) {
    const batch = await this.prisma.importBatch.findFirst({
      where: { id: batchId, communityId },
    });

    if (!batch) {
      throw new NotFoundException('Import batch not found.');
    }

    if (batch.status !== ImportBatchStatus.PROCESSING) {
      throw new BadRequestException(
        'Only pending import batches can be cancelled.',
      );
    }

    await this.prisma.importBatch.update({
      where: { id: batchId },
      data: { status: ImportBatchStatus.ROLLED_BACK, rolledBackAt: new Date() },
    });

    return {
      success: true,
      message: 'Import batch cancelled.',
    };
  }

  async batches(communityId: string) {
    const batches = await this.prisma.importBatch.findMany({
      where: { communityId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      success: true,
      message: 'Import batches retrieved successfully.',
      data: batches,
    };
  }

  // ==========================================
  // Parser
  // ==========================================

  private async parseFile(file: Express.Multer.File): Promise<any[]> {
    const name = file.originalname.toLowerCase();

    if (name.endsWith('.csv')) {
      const text = file.buffer.toString('utf8').replace(/^\uFEFF/, '');
      const lines = text.split(/\r?\n/).filter((line) => line.trim());

      if (lines.length === 0) {
        throw new BadRequestException('File is empty.');
      }

      const headers = this.parseCsvLine(lines[0]).map((header) =>
        header
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, ''),
      );

      return lines.slice(1).map((line, index) => {
        const values = this.parseCsvLine(line);
        const record: any = {};
        headers.forEach((header, i) => {
          record[header] = (values[i] ?? '').trim();
        });
        record._row = index + 2;
        return record;
      });
    }

    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.buffer as any);

      const sheet = workbook.worksheets[0];
      if (!sheet) {
        throw new BadRequestException('Workbook is empty.');
      }

      const rows = sheet.getRows(1, sheet.rowCount) ?? [];
      const headers = (rows[0]?.values as any[]).slice(1).map((header) =>
        String(header ?? '')
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, ''),
      );

      const output: any[] = [];
      for (let i = 1; i < rows.length; i += 1) {
        const values = (rows[i]?.values as any[]).slice(1);
        const record: any = {};
        headers.forEach((header, j) => {
          record[header] =
            values[j] === null || values[j] === undefined
              ? ''
              : String(values[j]).trim();
        });
        record._row = i + 1;
        output.push(record);
      }

      return output;
    }

    throw new BadRequestException(
      'Unsupported file type. Upload a CSV or XLSX file.',
    );
  }

  private parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"') {
          if (line[i + 1] === '"') {
            current += '"';
            i += 1;
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current);
    return values;
  }

  // ==========================================
  // Validation
  // ==========================================

  private validateRows(
    communityId: string,
    kind: ImportKind,
    rows: any[],
  ): { valid: any[]; invalid: any[] } {
    const valid: any[] = [];
    const invalid: any[] = [];

    for (const raw of rows) {
      const row = { ...raw };
      const errors: string[] = [];
      const { _row, ...data } = row;

      if (kind === 'payments') {
        if (!data.paymentnumber) errors.push('paymentNumber is required');
        if (!data.amount || Number.isNaN(Number(data.amount))) {
          errors.push('amount must be a number');
        }
        if (!data.paymentdate) errors.push('paymentDate is required');
        if (data.paymentdate && Number.isNaN(Date.parse(data.paymentdate))) {
          errors.push('paymentDate must be a valid date');
        }
      } else if (kind === 'utility-readings') {
        if (!data.utilitytype) errors.push('utilityType is required');
        if (!data.block && !data.lot) {
          errors.push('block/lot is required');
        }
        if (!data.period) errors.push('period (YYYY-MM) is required');
        if (
          data.period &&
          !/^\d{4}-(0[1-9]|1[0-2])$/.test(String(data.period))
        ) {
          errors.push('period must be in YYYY-MM format');
        }
        if (
          data.currentreading !== undefined &&
          data.currentreading !== '' &&
          Number.isNaN(Number(data.currentreading))
        ) {
          errors.push('currentReading must be a number');
        }
      } else if (kind === 'expenses') {
        if (!data.title) errors.push('title is required');
        if (!data.amount || Number.isNaN(Number(data.amount))) {
          errors.push('amount must be a number');
        }
        if (!data.expensedate) errors.push('expenseDate is required');
        if (data.expensedate && Number.isNaN(Date.parse(data.expensedate))) {
          errors.push('expenseDate must be a valid date');
        }
      } else {
        if (!data.block && !data.lot) {
          errors.push('block/lot is required');
        }
        if (!data.amount || Number.isNaN(Number(data.amount))) {
          errors.push('amount must be a number');
        }
        if (!data.duedate) errors.push('dueDate is required');
      }

      valid.push({ ...data, _row, errors });
      if (errors.length) {
        invalid.push({ ...data, _row, errors });
      }
    }

    return { valid, invalid };
  }

  // ==========================================
  // Apply rows
  // ==========================================

  private async applyPayments(
    communityId: string,
    batchId: string,
    rows: any[],
  ): Promise<number> {
    let created = 0;

    const paymentMethods = Object.values(PaymentMethod);

    for (const row of rows) {
      const household = await this.prisma.household.findFirst({
        where: {
          communityId,
          deletedAt: null,
          ...(row.block ? { block: String(row.block) } : {}),
          ...(row.lot ? { lot: String(row.lot) } : {}),
        },
        include: {
          residents: {
            where: { deletedAt: null },
            take: 1,
          },
        },
      });

      const resident = household?.residents[0];
      if (!resident) continue;

      const method = paymentMethods.includes(row.method?.toUpperCase())
        ? (row.method.toUpperCase() as PaymentMethod)
        : PaymentMethod.CASH;

      const paymentDate = new Date(row.paymentdate);
      const periodKey = row.period
        ? String(row.period)
        : `${paymentDate.getFullYear()}-${String(
            paymentDate.getMonth() + 1,
          ).padStart(2, '0')}`;

      const chargeType = row.chargetypecode
        ? await this.prisma.chargeType.findFirst({
            where: {
              communityId,
              code: String(row.chargetypecode).trim(),
              deletedAt: null,
            },
          })
        : undefined;

      const assessment = chargeType
        ? await this.prisma.assessment.findFirst({
            where: {
              communityId,
              householdId: household.id,
              chargeTypeId: chargeType.id,
              deletedAt: null,
              period: periodKey,
              status: {
                in: [
                  AssessmentStatus.ISSUED,
                  AssessmentStatus.PARTIALLY_PAID,
                  AssessmentStatus.OVERDUE,
                ],
              },
            },
          })
        : undefined;

      await this.prisma.payment.create({
        data: {
          communityId,
          paymentNumber: String(row.paymentnumber).trim(),
          residentId: resident.id,
          amount: Number(row.amount),
          paymentDate,
          method,
          referenceNumber: row.reference ?? undefined,
          remarks: row.remarks ?? undefined,
          chargeTypeId: chargeType?.id,
          status: PaymentStatus.PENDING_VERIFICATION,
          isImported: true,
          importBatchId: batchId,
          allocations: assessment
            ? {
                create: [
                  {
                    communityId,
                    assessmentId: assessment.id,
                    allocatedAmount: Number(row.amount),
                  },
                ],
              }
            : undefined,
        },
      });

      if (assessment) {
        await this.financeSyncService.syncAssessment(
          communityId,
          assessment.id,
        );
      }
      created += 1;
    }

    return created;
  }

  private async applyAssessments(
    communityId: string,
    batchId: string,
    rows: any[],
  ): Promise<number> {
    let created = 0;

    for (const row of rows) {
      const household = await this.prisma.household.findFirst({
        where: {
          communityId,
          deletedAt: null,
          ...(row.block ? { block: String(row.block) } : {}),
          ...(row.lot ? { lot: String(row.lot) } : {}),
        },
      });

      if (!household) continue;

      const chargeType = row.chargetypecode
        ? await this.prisma.chargeType.findFirst({
            where: {
              communityId,
              code: String(row.chargetypecode).trim(),
              deletedAt: null,
            },
          })
        : undefined;

      const period = row.period ? String(row.period) : undefined;

      let billingPeriodId: string | undefined;
      if (chargeType && period) {
        const existingPeriod = await this.prisma.billingPeriod.findFirst({
          where: {
            communityId,
            chargeTypeId: chargeType.id,
            periodKey: period,
            deletedAt: null,
          },
        });

        if (existingPeriod) {
          billingPeriodId = existingPeriod.id;
        } else {
          const [year, month] = period.split('-').map(Number);
          if (year && month) {
            const lastDay = new Date(year, month, 0).getDate();
            const createdPeriod = await this.prisma.billingPeriod.create({
              data: {
                communityId,
                chargeTypeId: chargeType.id,
                periodKey: period,
                label: `${chargeType.name} - ${period}`,
                startDate: new Date(year, month - 1, 1),
                dueDate: new Date(
                  year,
                  month - 1,
                  Math.min(chargeType.dueDay ?? 1, lastDay),
                ),
                amount: Number(row.amount),
                status: BillingPeriodStatus.OPEN,
              },
            });
            billingPeriodId = createdPeriod.id;
          }
        }
      }

      const dueDate = new Date(row.duedate);

      const latest = await this.prisma.assessment.findFirst({
        where: { communityId },
        orderBy: { assessmentNumber: 'desc' },
        select: { assessmentNumber: true },
      });

      let nextNumber = 0;
      if (latest) {
        const parsed = parseInt(
          latest.assessmentNumber.replace(/^ASS-/, ''),
          10,
        );
        if (!Number.isNaN(parsed)) nextNumber = parsed;
      }

      await this.prisma.assessment.create({
        data: {
          communityId,
          assessmentNumber: `ASS-${String(nextNumber + 1).padStart(6, '0')}`,
          title: row.title ?? chargeType?.name ?? 'Imported charge',
          description: row.description ?? undefined,
          householdId: household.id,
          amount: Number(row.amount),
          dueDate,
          period,
          chargeTypeId: chargeType?.id,
          billingPeriodId,
          remarks: row.remarks ?? undefined,
          status: AssessmentStatus.ISSUED,
          isImported: true,
          importBatchId: batchId,
        },
      });

      if (billingPeriodId) {
        await this.financeSyncService.syncPeriod(communityId, billingPeriodId);
      }

      created += 1;
    }

    return created;
  }

  private async applyExpenses(
    communityId: string,
    batchId: string,
    rows: any[],
    createdById: string,
  ): Promise<number> {
    let created = 0;

    const expenseCategories = Object.values(ExpenseCategory);
    const paymentMethods = Object.values(PaymentMethod);

    for (const row of rows) {
      const latest = await this.prisma.expense.findFirst({
        where: { communityId },
        orderBy: { expenseNumber: 'desc' },
        select: { expenseNumber: true },
      });

      let nextNumber = 0;
      if (latest) {
        const parsed = parseInt(latest.expenseNumber.replace(/^EXP-/, ''), 10);
        if (!Number.isNaN(parsed)) nextNumber = parsed;
      }

      const category = expenseCategories.includes(row.category?.toUpperCase())
        ? (row.category.toUpperCase() as ExpenseCategory)
        : ExpenseCategory.OTHER;

      const method = paymentMethods.includes(row.paymentmethod?.toUpperCase())
        ? (row.paymentmethod.toUpperCase() as PaymentMethod)
        : PaymentMethod.CASH;

      await this.prisma.expense.create({
        data: {
          communityId,
          expenseNumber: `EXP-${String(nextNumber + 1).padStart(6, '0')}`,
          title: String(row.title).trim(),
          description: row.description ?? undefined,
          category,
          amount: Number(row.amount),
          expenseDate: new Date(row.expensedate),
          paymentMethod: method,
          payee: row.payee ?? undefined,
          referenceNumber: row.reference ?? undefined,
          notes: row.notes ?? undefined,
          createdById,
          isImported: true,
          importBatchId: batchId,
        },
      });

      created += 1;
    }

    return created;
  }

  private async applyUtilityReadings(
    communityId: string,
    batchId: string,
    rows: any[],
    recordedById: string,
  ): Promise<number> {
    let created = 0;

    const utilityTypes = Object.values(UtilityType);

    for (const row of rows) {
      const utilityType = utilityTypes.includes(row.utilitytype?.toUpperCase())
        ? (row.utilitytype.toUpperCase() as UtilityType)
        : undefined;

      if (!utilityType) continue;

      const config = await this.prisma.utilityConfig.findFirst({
        where: {
          communityId,
          utilityType,
          deletedAt: null,
        },
      });
      if (!config) continue;

      const household = await this.prisma.household.findFirst({
        where: {
          communityId,
          deletedAt: null,
          ...(row.block ? { block: String(row.block) } : {}),
          ...(row.lot ? { lot: String(row.lot) } : {}),
        },
      });
      if (!household) continue;

      const periodKey = String(row.period).trim();

      const duplicate = await this.prisma.utilityReading.findUnique({
        where: {
          utilityConfigId_householdId_periodKey: {
            utilityConfigId: config.id,
            householdId: household.id,
            periodKey,
          },
        },
      });
      if (duplicate) continue;

      const previous =
        row.previousreading !== undefined && row.previousreading !== ''
          ? Number(row.previousreading)
          : (
              await this.prisma.utilityReading.findFirst({
                where: {
                  utilityConfigId: config.id,
                  householdId: household.id,
                  periodKey: { lt: periodKey },
                  currentReading: { not: null },
                },
                orderBy: { periodKey: 'desc' },
                select: { currentReading: true },
              })
            )?.currentReading?.toNumber();
      const current =
        row.currentreading !== undefined && row.currentreading !== ''
          ? Number(row.currentreading)
          : undefined;
      const usage =
        previous !== undefined &&
        previous !== null &&
        current !== undefined &&
        current !== null
          ? Math.round((current - previous) * 100) / 100
          : null;

      await this.prisma.utilityReading.create({
        data: {
          communityId,
          utilityConfigId: config.id,
          householdId: household.id,
          periodKey,
          previousReading: previous ?? null,
          currentReading: current ?? null,
          usage: usage !== null && usage >= 0 ? usage : null,
          readingDate: new Date(),
          recordedById,
          notes: row.notes ?? undefined,
          isImported: true,
          importBatchId: batchId,
        },
      });

      created += 1;
    }

    return created;
  }
}
