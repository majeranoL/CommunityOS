import { BadRequestException, NotFoundException } from '@nestjs/common';

import { ImportBatchStatus } from '@prisma/client';

import { ImportExportService } from './import-export.service';
import { ModuleRegistry } from './module-registry';
import { registerAllAdapters } from './adapters';
import type { ImportPreviewResult } from './import-export.types';

function csvBuffer(...rows: string[]): Buffer {
  return Buffer.from('\uFEFF' + rows.join('\n'), 'utf-8');
}

async function previewWithMapping(
  service: ImportExportService,
  communityId: string,
  module: string,
  file: Buffer,
  fileName: string,
  mapping: Record<string, string>,
): Promise<ImportPreviewResult> {
  const result = await service.preview(
    communityId,
    module,
    file,
    fileName,
    mapping,
    'user-1',
  );
  return result as ImportPreviewResult;
}

const HOUSEHOLD_CSV = csvBuffer(
  'Block,Lot,Unit,Address,Status',
  'A,1,101,123 Main St,ACTIVE',
  'B,2,102,456 Oak Ave,INACTIVE',
  'C,3,103,789 Pine Rd,ACTIVE',
);

const MAPPING = {
  block: 'block',
  lot: 'lot',
  unit: 'unit',
  address: 'address',
  status: 'status',
};

function batchFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'batch-1',
    communityId: 'community-1',
    module: 'households',
    fileName: 'households.csv',
    importedById: 'user-1',
    status: ImportBatchStatus.PROCESSING,
    canRollback: true,
    data: [
      {
        _row: 2,
        block: 'A',
        lot: '1',
        unit: '101',
        address: '123 Main St',
        status: 'ACTIVE',
        errors: [],
      },
      {
        _row: 3,
        block: 'B',
        lot: '2',
        unit: '102',
        address: '456 Oak Ave',
        status: 'INACTIVE',
        errors: [],
      },
      {
        _row: 4,
        block: 'C',
        lot: '3',
        unit: '103',
        address: '789 Pine Rd',
        status: 'ACTIVE',
        errors: [],
      },
    ],
    resultCounts: {
      total: 3,
      valid: 3,
      invalid: 0,
    },
    ...overrides,
  };
}

function makePrisma(overrides: Record<string, unknown> = {}) {
  const prisma: any = {
    $transaction: jest.fn(async (ops: any[]) =>
      Array.isArray(ops) ? Promise.all(ops) : ops,
    ),
    importBatch: {
      create: jest.fn().mockResolvedValue({ id: 'batch-1' }),
      findFirst: jest.fn().mockResolvedValue(batchFixture()),
      update: jest.fn().mockResolvedValue({ id: 'batch-1' }),
      findMany: jest.fn().mockResolvedValue([batchFixture()]),
      count: jest.fn().mockResolvedValue(1),
    },
    household: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'household-new' }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'h1',
          block: 'A',
          lot: '1',
          unit: '101',
          address: '123 Main St',
          status: 'ACTIVE',
          createdAt: new Date('2026-01-01'),
          _count: { residents: 2 },
        },
      ]),
    },
    vehicle: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'v1',
          plateNumber: 'ABC 1234',
          make: 'Toyota',
          model: 'Vios',
          color: 'White',
          type: 'CAR',
          status: 'ACTIVE',
          createdAt: new Date('2026-01-01'),
          resident: {
            firstName: 'Ana',
            lastName: 'Doe',
            household: { block: 'A', lot: '1' },
          },
        },
      ]),
    },
    ...overrides,
  };
  return prisma;
}

function makeService(overrides: Record<string, unknown> = {}) {
  const registry = new ModuleRegistry();
  registerAllAdapters(registry);
  const prisma = makePrisma(overrides);
  const service = new ImportExportService(prisma, registry);
  return { service, prisma, registry };
}

describe('ImportExportService.schema', () => {
  it('returns template fields and export columns for a module', () => {
    const { service } = makeService();
    const schema = service.schema('households');
    expect(schema.entityLabel).toBe('Household');
    expect(schema.templateFields.map((f) => f.key)).toEqual(
      expect.arrayContaining(['block', 'lot', 'unit', 'address', 'status']),
    );
    expect(schema.exportColumns.map((c) => c.key)).toEqual(
      expect.arrayContaining(['block', 'lot', 'residentCount']),
    );
  });

  it('throws for an unknown module', () => {
    const { service } = makeService();
    expect(() => service.schema('nope')).toThrow(BadRequestException);
  });
});

describe('ImportExportService.preview', () => {
  it('detect mode returns headers, auto-mapping and sample without creating a batch', async () => {
    const { service, prisma } = makeService();
    const result = await service.preview(
      'community-1',
      'households',
      HOUSEHOLD_CSV,
      'households.csv',
      undefined,
      'user-1',
    );

    expect(prisma.importBatch.create).not.toHaveBeenCalled();
    expect(result.totalRows).toBe(3);
    expect(result.autoMapping).toEqual({
      block: 'block',
      lot: 'lot',
      unit: 'unit',
      address: 'address',
      status: 'status',
    });
    expect(result.sourceHeaders).toEqual([
      'block',
      'lot',
      'unit',
      'address',
      'status',
    ]);
  });

  it('mapped mode creates a batch and returns all rows with counts', async () => {
    const { service, prisma } = makeService();
    const result = await previewWithMapping(
      service,
      'community-1',
      'households',
      HOUSEHOLD_CSV,
      'households.csv',
      MAPPING,
    );

    expect(prisma.importBatch.create).toHaveBeenCalled();
    expect(result.batchId).toBe('batch-1');
    expect(result.totalRows).toBe(3);
    expect(result.validRows).toBe(3);
    expect(result.invalidRows).toBe(0);
    expect(result.rows).toHaveLength(3);
    expect(result.preview).toHaveLength(3);
    expect(result.columns.map((c) => c.key)).toEqual([
      'block',
      'lot',
      'unit',
      'address',
      'status',
    ]);
  });

  it('marks rows with validation errors as invalid', async () => {
    const { service } = makeService();
    const buffer = csvBuffer(
      'Block,Lot,Unit,Address,Status',
      ',7,,,BOGUS',
      'A,8,101,Ok St,ACTIVE',
    );
    const result = await previewWithMapping(
      service,
      'community-1',
      'households',
      buffer,
      'households.csv',
      MAPPING,
    );

    expect(result.validRows).toBe(1);
    expect(result.invalidRows).toBe(1);
    expect(result.rows).toHaveLength(2);
    expect(
      result.rows.find((r) => r._row === 2)!.errors.length,
    ).toBeGreaterThan(0);
  });
});

describe('ImportExportService.confirm', () => {
  it('imports only the selected valid rows', async () => {
    const { service, prisma } = makeService();
    const result = await service.confirm(
      'community-1',
      'batch-1',
      'user-1',
      [2, 4],
    );

    expect(result.data.created).toBe(2);
    expect(prisma.household.create).toHaveBeenCalledTimes(2);
    expect(prisma.importBatch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ImportBatchStatus.COMPLETED,
          resultCounts: expect.objectContaining({
            imported: 2,
            selected: 2,
            valid: 3,
          }),
        }),
      }),
    );
  });

  it('imports all valid rows when no rowIndices are provided', async () => {
    const { service, prisma } = makeService();
    const result = await service.confirm('community-1', 'batch-1', 'user-1');

    expect(result.data.created).toBe(3);
    expect(prisma.household.create).toHaveBeenCalledTimes(3);
  });

  it('throws BadRequestException for an empty selection', async () => {
    const { service, prisma } = makeService();
    await expect(
      service.confirm('community-1', 'batch-1', 'user-1', []),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.household.create).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when no valid rows are selected', async () => {
    const { service, prisma } = makeService();
    await expect(
      service.confirm('community-1', 'batch-1', 'user-1', [999]),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.household.create).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the batch is missing', async () => {
    const { service, prisma } = makeService();
    prisma.importBatch.findFirst.mockResolvedValue(null);
    await expect(
      service.confirm('community-1', 'batch-1', 'user-1'),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('ImportExportService.rollback', () => {
  it('soft-deletes records created by the batch', async () => {
    const { service, prisma } = makeService();
    prisma.importBatch.findFirst.mockResolvedValue({
      ...batchFixture(),
      status: ImportBatchStatus.COMPLETED,
    });

    const result = await service.rollback('community-1', 'batch-1');

    expect(result.success).toBe(true);
    expect(prisma.household.updateMany).toHaveBeenCalledWith({
      where: { importBatchId: 'batch-1', deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
    expect(prisma.importBatch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ImportBatchStatus.ROLLED_BACK,
        }),
      }),
    );
  });
});

describe('ImportExportService.batches', () => {
  it('returns batches with the importer relation', async () => {
    const { service, prisma } = makeService();
    prisma.importBatch.findMany.mockResolvedValue([
      batchFixture({
        importedBy: { id: 'user-1', firstName: 'Ana', lastName: 'Doe' },
      }),
    ]);

    const result = await service.batches('community-1', 'households');

    expect(result.pagination.total).toBe(1);
    const select = prisma.importBatch.findMany.mock.calls[0][0].select;
    expect(select.importedBy).toBeDefined();
    expect(result.data[0].importedBy.lastName).toBe('Doe');
  });
});

describe('ImportExportService.exportData', () => {
  it('applies filters and column selection', async () => {
    const { service, prisma } = makeService();

    await service.exportData(
      'community-1',
      'vehicles',
      'csv',
      { status: 'ACTIVE', type: 'CAR' },
      ['plateNumber'],
    );

    const call = prisma.vehicle.findMany.mock.calls[0][0];
    expect(call.where).toEqual(
      expect.objectContaining({ status: 'ACTIVE', type: 'CAR' }),
    );
  });
});
